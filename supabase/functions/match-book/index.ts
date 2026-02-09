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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI服务未配置" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Matching book: ${bookTitle}`);

    const systemPrompt = `你是一个专业的书籍信息匹配助手。用户会输入一本书的名称，你需要识别这本书并返回详细信息。

请严格按照以下JSON格式返回结果：
{
  "title": "书名（原文）",
  "author": "作者名",
  "genre": "书籍类型（如：小说、历史、哲学、科幻、传记等）",
  "country": "书籍主要关联的国家（中文名）",
  "countryCode": "国家的ISO 3166-1 alpha-2代码（如CN、US、GB、JP等）",
  "description": "一句话简介（不超过50字）"
}

关联国家的判断规则：
1. 优先使用书籍故事发生的主要地点
2. 如果是非虚构类，使用书籍描述的主题相关国家
3. 如果上述都不适用，使用作者的国籍
4. 确保countryCode是有效的ISO代码

只返回JSON，不要有其他文字。`;

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
    const content = aiResponse.choices?.[0]?.message?.content;

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
