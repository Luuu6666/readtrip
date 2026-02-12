import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookTitle } = await req.json();
    
    if (!bookTitle || typeof bookTitle !== 'string') {
      return new Response(
        JSON.stringify({ error: "请提供书籍名称" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const VOLC_API_KEY = Deno.env.get("VOLC_API_KEY");
    const VOLC_ENDPOINT_ID = Deno.env.get("VOLC_ENDPOINT_ID");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!VOLC_API_KEY && !GEMINI_API_KEY && !LOVABLE_API_KEY) {
      console.error("No AI API key configured");
      return new Response(
        JSON.stringify({ error: "AI服务未配置，请在 Supabase Edge Functions Secrets 中配置 VOLC_API_KEY（火山引擎）、GEMINI_API_KEY 或 LOVABLE_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Matching book: ${bookTitle}`);

    // 快速路径：优先从豆瓣搜索匹配（通常 <1s），再用短 AI 请求仅补全国籍
    let doubanMatch: { title: string; author: string; coverUrl: string } | null = null;
    try {
      const doubanController = new AbortController();
      const doubanTimeout = setTimeout(() => doubanController.abort(), 3000);
      const doubanRes = await fetch(
        `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(bookTitle.trim())}`,
        {
          signal: doubanController.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; ReadTrip/1.0)",
          },
        }
      );
      clearTimeout(doubanTimeout);
      if (doubanRes.ok) {
        const suggests = (await doubanRes.json()) as Array<{ title?: string; author_name?: string; pic?: string }>;
        if (Array.isArray(suggests) && suggests.length > 0) {
          const first = suggests[0];
          const title = first.title?.trim();
          const authorRaw = first.author_name ?? "";
          const author = typeof authorRaw === "string"
            ? authorRaw.replace(/\s*[著编]\s*$/, "").replace(/^\[[^\]]*\]\s*/, "").trim() || authorRaw
            : String(authorRaw);
          if (title && author) {
            doubanMatch = {
              title,
              author,
              coverUrl: first.pic && first.pic.startsWith("http") ? first.pic : "",
            };
            console.log("Douban fast match:", doubanMatch.title, doubanMatch.author);
          }
        }
      }
    } catch (e) {
      console.log("Douban suggest skipped:", e);
    }

    // 若豆瓣命中，仅用 AI 补全国籍（极短 prompt，响应快）
    if (doubanMatch && (VOLC_API_KEY || GEMINI_API_KEY || LOVABLE_API_KEY)) {
      const countryPrompt = `根据作者名返回其国籍。作者：${doubanMatch.author}。只返回JSON：{"country":"国家中文名","countryCode":"两字母ISO代码"}。`;
      let countryContent: string | undefined;
      if (VOLC_API_KEY) {
        const volcModel = VOLC_ENDPOINT_ID || Deno.env.get("VOLC_MODEL") || "doubao-seed-1-8-251228";
        const volcRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Authorization": `Bearer ${VOLC_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: volcModel,
            input: [{ role: "user", content: [{ type: "input_text", text: countryPrompt }] }],
          }),
        });
        if (volcRes.ok) {
          const volcData = (await volcRes.json()) as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
          for (const item of volcData.output ?? []) {
            if (item.type === "message" && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (part.type === "output_text" && part.text) {
                  countryContent = part.text;
                  break;
                }
              }
              if (countryContent) break;
            }
          }
        }
      } else if (GEMINI_API_KEY) {
        const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: countryPrompt }] }],
          }),
        });
        if (gRes.ok) {
          const gData = (await gRes.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const parts = gData.candidates?.[0]?.content?.parts ?? [];
          countryContent = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");
        }
      } else if (LOVABLE_API_KEY) {
        const lovRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: countryPrompt }],
          }),
        });
        if (lovRes.ok) {
          const lovData = await lovRes.json();
          countryContent = lovData?.choices?.[0]?.message?.content;
        }
      }
      const countryMatch = countryContent?.match(/\{[\s\S]*\}/);
      if (countryMatch) {
        try {
          const countryInfo = JSON.parse(countryMatch[0]) as { country?: string; countryCode?: string };
          if (countryInfo.country && countryInfo.countryCode) {
            const finalBookInfo = {
              title: doubanMatch.title,
              author: doubanMatch.author,
              genre: "",
              country: countryInfo.country,
              countryCode: countryInfo.countryCode.toUpperCase(),
              description: "",
              coverUrl: doubanMatch.coverUrl || undefined,
            };
            console.log("Book matched (Douban+AI country):", finalBookInfo);
            return new Response(
              JSON.stringify({ success: true, book: finalBookInfo }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (_) {}
      }
      doubanMatch = null;
    }

    const systemPrompt = `你是一个专业的书籍信息匹配助手。用户会输入一本书的名称，你需要识别这本书并返回详细信息。

请严格按照以下JSON格式返回结果：
{
  "title": "书名（原文）",
  "author": "作者名",
  "genre": "书籍类型（如：小说、历史、哲学、科幻、传记等）",
  "country": "作者国籍所在国家（中文名）",
  "countryCode": "作者国籍国家的ISO 3166-1 alpha-2代码（如CN、US、GB、JP等）",
  "description": "一句话简介（不超过50字）"
}

重要：country 与 countryCode 必须且仅表示「原作者国籍」，即作者本人所属/所属国，而不是：
- 书籍故事发生地（如写中东的书，作者是中国人则应为中国）
- 书籍主题或描写的地理区域
- 出版社所在国
示例：《看不见的中东》作者为中国人 → country 中国，countryCode CN；《和语言漫步的日记》作者为日本人 → country 日本，countryCode JP。
若作者有多重国籍，取主要或最常用国籍。确保 countryCode 为有效 ISO 3166-1 alpha-2 代码。

只返回JSON，不要有其他文字。`;

    let content: string | undefined;

    if (VOLC_API_KEY) {
      // 火山引擎 豆包 / 火山方舟 Responses API（与本地 Python SDK 一致，model 如 doubao-seed-1-8-251228）
      const volcModel = VOLC_ENDPOINT_ID || Deno.env.get("VOLC_MODEL") || "doubao-seed-1-8-251228";
      const volcUrl = "https://ark.cn-beijing.volces.com/api/v3/responses";
      const volcBody = {
        model: volcModel,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `${systemPrompt}\n\n请匹配这本书的信息：${bookTitle}` },
            ],
          },
        ],
      };
      const volcRes = await fetch(volcUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VOLC_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(volcBody),
      });
      const volcText = await volcRes.text();
      if (!volcRes.ok) {
        console.error("Volcengine API error:", volcRes.status, volcText);
        let errMsg = "火山引擎 AI 服务暂时不可用";
        try {
          const errJson = JSON.parse(volcText);
          errMsg = errJson?.error?.message || errJson?.message || volcText.slice(0, 200) || errMsg;
        } catch (_) {}
        if (volcRes.status === 401 || volcRes.status === 403) errMsg = "火山引擎 API Key 无效或未授权，请检查 VOLC_API_KEY";
        if (volcRes.status === 429) errMsg = "请求过于频繁，请稍后再试";
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: volcRes.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const volcData = JSON.parse(volcText) as {
          output?: Array<{
            type?: string;
            content?: Array<{ type?: string; text?: string }>;
            text?: string;
          }>;
          error?: { message?: string };
        };
        if (volcData.error?.message) {
          return new Response(
            JSON.stringify({ error: volcData.error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const output = volcData.output;
        if (Array.isArray(output)) {
          for (const item of output) {
            if (item.type === "message" && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (part.type === "output_text" && part.text) {
                  content = part.text;
                  break;
                }
              }
              if (content) break;
            }
            if (item.text) {
              content = item.text;
              break;
            }
          }
        }
        if (!content && (volcData as { text?: string }).text) {
          content = (volcData as { text: string }).text;
        }
      } catch {
        console.error("Volcengine response not JSON:", volcText.slice(0, 300));
        return new Response(
          JSON.stringify({ error: "火山引擎返回格式异常" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (GEMINI_API_KEY) {
      // 使用 Google Gemini API，支持多模型回退（官方文档示例使用 gemini-2.0-flash）
      const envModel = Deno.env.get("GEMINI_MODEL");
      const modelList = envModel
        ? [envModel]
        : ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-2.0-flash-exp"];
      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `请匹配这本书的信息：${bookTitle}` }] }],
      };
      let errorText = "";
      let geminiResponse: Response | null = null;
      let lastModel = "";

      for (const geminiModel of modelList) {
        lastModel = geminiModel;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
        geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        errorText = await geminiResponse.text();
        if (geminiResponse.ok) break;
        if (geminiResponse.status !== 404) break;
        console.log(`Model ${geminiModel} not found, trying next...`);
      }

      if (!geminiResponse!.ok) {
        console.error("Gemini API error:", geminiResponse!.status, errorText);
        let errMsg = "AI服务暂时不可用";
        try {
          const errJson = JSON.parse(errorText);
          const detail = errJson?.error?.message || errJson?.error?.status || errorText.slice(0, 200);
          if (geminiResponse!.status === 404) errMsg = `当前密钥下无可用模型（已尝试 ${modelList.join("、")}），请在 Supabase Secrets 中设置 GEMINI_MODEL 为你的密钥支持的模型名`;
          else if (geminiResponse!.status === 403 || geminiResponse!.status === 401) errMsg = "AI服务密钥无效或未启用 API，请检查 GEMINI_API_KEY";
          else if (geminiResponse!.status === 429) errMsg = "请求过于频繁，请稍后再试";
          else errMsg = detail || errMsg;
        } catch (_) {
          if (geminiResponse!.status === 429) errMsg = "请求过于频繁，请稍后再试";
          else if (geminiResponse!.status === 403 || geminiResponse!.status === 401) errMsg = "AI服务密钥无效或已过期，请检查 GEMINI_API_KEY";
        }
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: geminiResponse!.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let geminiData: Record<string, unknown>;
      try {
        geminiData = JSON.parse(errorText) as Record<string, unknown>;
      } catch {
        console.error("Gemini response not JSON:", errorText.slice(0, 300));
        return new Response(
          JSON.stringify({ error: "AI 返回格式异常" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const promptFeedback = geminiData.promptFeedback as { blockReason?: string } | undefined;
      if (promptFeedback?.blockReason) {
        console.error("Gemini blocked:", promptFeedback.blockReason);
        return new Response(
          JSON.stringify({ error: "请求被安全策略拦截，请换一本书名重试" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const candidates = geminiData.candidates as Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }> | undefined;
      const candidate = candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      content = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");
      if (!content && candidate?.finishReason) {
        console.error("Gemini no content, finishReason:", candidate.finishReason);
        return new Response(
          JSON.stringify({ error: "AI 未返回有效内容，请重试" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // 使用 Lovable AI 网关（本地若已配 LOVABLE_API_KEY 可继续用）
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请匹配这本书的信息：${bookTitle}` },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI服务额度不足" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "AI服务暂时不可用" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await response.json();
      content = aiResponse.choices?.[0]?.message?.content;
    }

    if (!content) {
      console.error("Empty AI response");
      return new Response(
        JSON.stringify({ error: "未能获取书籍信息" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 解析AI返回的JSON
    let bookInfo;
    try {
      // 尝试提取JSON（处理可能的markdown代码块）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        bookInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "无法解析书籍信息" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 验证必要字段
    if (!bookInfo.title || !bookInfo.author || !bookInfo.country || !bookInfo.countryCode) {
      console.error("Incomplete book info:", bookInfo);
      return new Response(
        JSON.stringify({ error: "书籍信息不完整" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 尝试从Open Library获取书籍封面
    let coverUrl: string | undefined;
    try {
      const openLibraryQuery = encodeURIComponent(`${bookInfo.title} ${bookInfo.author}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const openLibraryResponse = await fetch(
        `https://openlibrary.org/search.json?q=${openLibraryQuery}&limit=1`,
        { 
          headers: { "Accept": "application/json" },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (openLibraryResponse.ok) {
        const openLibraryData = await openLibraryResponse.json();
        if (openLibraryData.docs && openLibraryData.docs.length > 0) {
          const firstResult = openLibraryData.docs[0];
          // Open Library封面URL格式: https://covers.openlibrary.org/b/{key}/{value}-{size}.jpg
          if (firstResult.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${firstResult.cover_i}-L.jpg`;
          } else if (firstResult.isbn && firstResult.isbn.length > 0) {
            // 使用ISBN获取封面
            coverUrl = `https://covers.openlibrary.org/b/isbn/${firstResult.isbn[0]}-L.jpg`;
          }
        }
      }
    } catch (coverError) {
      console.log("Failed to fetch cover from Open Library:", coverError);
      // 封面获取失败不影响主流程，继续执行
    }

    // 如果Open Library没有找到，尝试使用Google Books API
    if (!coverUrl) {
      try {
        const googleBooksQuery = encodeURIComponent(`${bookInfo.title} ${bookInfo.author}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        const googleBooksResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${googleBooksQuery}&maxResults=1`,
          { 
            headers: { "Accept": "application/json" },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);

        if (googleBooksResponse.ok) {
          const googleBooksData = await googleBooksResponse.json();
          if (googleBooksData.items && googleBooksData.items.length > 0) {
            const volumeInfo = googleBooksData.items[0].volumeInfo;
            if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
              // Google Books返回的是thumbnail，我们使用large或medium
              coverUrl = volumeInfo.imageLinks.large || 
                        volumeInfo.imageLinks.medium || 
                        volumeInfo.imageLinks.thumbnail;
              // 将http替换为https
              if (coverUrl) {
                coverUrl = coverUrl.replace(/^http:/, 'https:');
              }
            }
          }
        }
      } catch (googleError) {
        console.log("Failed to fetch cover from Google Books:", googleError);
        // 封面获取失败不影响主流程，继续执行
      }
    }

    const finalBookInfo = {
      ...bookInfo,
      coverUrl: coverUrl || undefined,
    };

    console.log("Book matched:", finalBookInfo);

    return new Response(
      JSON.stringify({ success: true, book: finalBookInfo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in match-book function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "未知错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
