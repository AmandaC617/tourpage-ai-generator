"use client";

import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// 型別定義
interface StructuredData {
  hero?: {
    title?: string;
    description?: string;
    ctaButtonText?: string;
    ctaButtonLink?: string; // 新增：CTA 連結
    title_zh?: string;
    description_zh?: string;
    ctaButtonText_zh?: string;
  };
  about?: {
    badge?: string;
    title?: string;
    description?: string;
    image?: string; // 新增：關於我們圖片
    badge_zh?: string;
    title_zh?: string;
    description_zh?: string;
  };
  // 新增 Solution 區塊
  solutions?: Array<{
    badge?: string;
    title?: string;
    description?: string;
    badge_zh?: string;
    title_zh?: string;
    description_zh?: string;
  }>;
  products?: Array<{
    title?: string;
    shortDescription?: string;
    completeDescription?: string;
    title_zh?: string;
    shortDescription_zh?: string;
    completeDescription_zh?: string;
  }>;
  contact?: {
    badge?: string;
    title?: string;
    description?: string;
    badge_zh?: string;
    title_zh?: string;
    description_zh?: string;
  };
  // 新增SEO優化欄位
  seo?: {
    // Meta標籤
    metaDescription?: string;
    metaDescription_zh?: string;
    metaKeywords?: string;
    metaKeywords_zh?: string;
    
    // Open Graph標籤
    ogTitle?: string;
    ogTitle_zh?: string;
    ogDescription?: string;
    ogDescription_zh?: string;
    ogType?: string;
    
    // 內容SEO優化
    h2Suggestions?: string[];
    h2Suggestions_zh?: string[];
    h3Suggestions?: string[];
    h3Suggestions_zh?: string[];
    
    // 關鍵字分析
    primaryKeywords?: string[];
    primaryKeywords_zh?: string[];
    longTailKeywords?: string[];
    longTailKeywords_zh?: string[];
    keywordDensity?: {
      keyword: string;
      density: number;
      recommendation: string;
    }[];
    
    // 競爭分析
    competitorAnalysis?: {
      industry: string;
      industry_zh?: string;
      competitorKeywords?: string[];
      competitorKeywords_zh?: string[];
      gapAnalysis?: string;
      gapAnalysis_zh?: string;
      recommendations?: string;
      recommendations_zh?: string;
    };
    
    // USP差異化
    uspAnalysis?: {
      uniqueSellingPoints?: string[];
      uniqueSellingPoints_zh?: string[];
      differentiationStrategy?: string;
      differentiationStrategy_zh?: string;
      positioningStatement?: string;
      positioningStatement_zh?: string;
    };
    
    // 內容優化建議
    contentOptimization?: {
      titleLength?: {
        current: number;
        recommended: string;
        recommendation_zh?: string;
      };
      descriptionLength?: {
        current: number;
        recommended: string;
        recommendation_zh?: string;
      };
      readabilityScore?: {
        score: number;
        suggestions: string;
        suggestions_zh?: string;
      };
    };
  };
  
  // 結構化資料
  structuredData?: {
    // 商業實體結構化資料
    organization?: {
      type: string;
      name: string;
      description: string;
      url?: string;
      logo?: string;
      contactPoint?: {
        telephone?: string;
        email?: string;
        contactType?: string;
      };
      address?: {
        streetAddress?: string;
        addressLocality?: string;
        addressRegion?: string;
        postalCode?: string;
        addressCountry?: string;
      };
    };
    
    // 產品結構化資料
    products?: Array<{
      type: string;
      name: string;
      description: string;
      brand?: string;
      category?: string;
      offers?: {
        availability?: string;
        price?: string;
        priceCurrency?: string;
      };
    }>;
    
    // 網站結構化資料
    website?: {
      type: string;
      url: string;
      name: string;
      description: string;
      potentialAction?: {
        type: string;
        target: string;
      };
    };
  };
}

interface Parameters {
  audience: string;
  language: string;
  focus: string;
  keywords: string;
  // SEO 擴展參數
  industryCategory?: string;
  targetLocation?: string;
  businessType?: string;
  competitorUrls?: string;
  seoMode?: string; // 'basic' | 'advanced'
  contentLength?: string; // 'short' | 'medium' | 'long'
}

// 嘗試將模型回覆文字轉成合法 JSON 物件的健壯解析器
function robustParseModelJson(text: string): any {
  // 1) 去除三引號程式碼區塊包裹（```json ... ``` 或 ``` ... ```）
  let cleaned = text.trim();
  if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  // 2) 若仍包含多餘前後文，擷取第一個 { 到最後一個 }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  // 3) 嘗試直接解析
  try {
    return JSON.parse(cleaned);
  } catch (_) {}
  // 4) 去除尾逗點
  try {
    const noTrailingCommas = cleaned.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(noTrailingCommas);
  } catch (_) {}
  // 5) 盡力為未加引號的 key 補上引號（僅限鍵名部分）
  try {
    const quotedKeys = cleaned.replace(/([,{\s])([A-Za-z_][A-Za-z0-9_\-]*)\s*:/g, '$1"$2":');
    const noTrailingCommas2 = quotedKeys.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(noTrailingCommas2);
  } catch (e) {
    throw new Error("模型輸出非合法 JSON，且自動修復失敗");
  }
}

export default function Home() {
  const [generatedCopyData, setGeneratedCopyData] =
    useState<StructuredData | null>(null);
  const [originalCsvStructure, setOriginalCsvStructure] = useState<
    string[][] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<
    "loading" | "error" | "success"
  >("loading");

  const [targetAudience, setTargetAudience] = useState("B2C");
  const [targetLanguage, setTargetLanguage] = useState("zh-TW");
  const [marketingFocus, setMarketingFocus] = useState("brand");
  const [requiredKeywords, setRequiredKeywords] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [inputMode, setInputMode] = useState<"csv" | "text">("text");
  const [textInput, setTextInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  
  // SEO 擴展狀態
  const [industryCategory, setIndustryCategory] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [seoMode, setSeoMode] = useState("basic");
  const [contentLength, setContentLength] = useState("medium");
  const [showAdvancedSeo, setShowAdvancedSeo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 從 localStorage 讀取 API Key
  useEffect(() => {
    const savedApiKey = localStorage.getItem("gemini_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setShowApiKeyInput(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("gemini_api_key");
    setApiKey("");
    setShowApiKeyInput(true);
  };

  const genaiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const updateStatus = (
    message: string,
    type: "loading" | "error" | "success" = "loading"
  ) => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const parseCsvToStructuredJson = (csvData: string[][]): StructuredData => {
    const structuredData: StructuredData = {
      hero: {},
      about: {},
      products: [],
      contact: {},
    };
    let currentSection: string | null = null;
    let currentProductIndex = -1;

    for (const row of csvData) {
      const sectionHeader = row[0] ? row[0].trim() : "";
      const itemCode = row[1] ? row[1].trim() : "";
      const customerData = row[4] ? row[4].trim() : "";

      // 偵測區塊標題
      if (sectionHeader.startsWith("Hero")) {
        currentSection = "hero";
        continue;
      }
      if (sectionHeader.startsWith("About Us")) {
        currentSection = "about";
        continue;
      }
      if (sectionHeader.startsWith("carousel")) {
        currentSection = "product";
        structuredData.products?.push({});
        currentProductIndex++;
        continue;
      }
      // 若之後 CSV 也有 Solution 區塊可在此擴展偵測
      if (sectionHeader.startsWith("Contact Us")) {
        currentSection = "contact";
        continue;
      }

      // 根據目前區塊和項目代碼填入資料
      switch (currentSection) {
        case "hero":
          if (itemCode === "A" && structuredData.hero)
            structuredData.hero.title = customerData;
          if (itemCode === "B" && structuredData.hero)
            structuredData.hero.description = customerData;
          if (itemCode === "C" && structuredData.hero)
            structuredData.hero.ctaButtonText = customerData;
          if (itemCode === "D" && structuredData.hero)
            structuredData.hero.ctaButtonLink = customerData;
          break;
        case "about":
          if (itemCode === "A" && structuredData.about)
            structuredData.about.badge = customerData;
          if (itemCode === "B" && structuredData.about)
            structuredData.about.title = customerData;
          if (itemCode === "C" && structuredData.about)
            structuredData.about.description = customerData;
          if (itemCode === "D" && structuredData.about)
            structuredData.about.image = customerData;
          break;
        case "product":
          if (
            currentProductIndex > -1 &&
            structuredData.products &&
            structuredData.products[currentProductIndex]
          ) {
            if (itemCode === "A")
              structuredData.products[currentProductIndex].title = customerData;
            if (itemCode === "B")
              structuredData.products[currentProductIndex].shortDescription =
                customerData;
            if (itemCode === "C")
              structuredData.products[currentProductIndex].completeDescription =
                customerData;
          }
          break;
        case "contact":
          if (itemCode === "A" && structuredData.contact)
            structuredData.contact.badge = customerData;
          if (itemCode === "B" && structuredData.contact)
            structuredData.contact.title = customerData;
          if (itemCode === "C" && structuredData.contact)
            structuredData.contact.description = customerData;
          break;
      }
    }

    // 清理空物件
    if (
      structuredData.hero &&
      Object.keys(structuredData.hero).length === 0
    )
      delete structuredData.hero;
    if (
      structuredData.about &&
      Object.keys(structuredData.about).length === 0
    )
      delete structuredData.about;
    if (
      structuredData.products &&
      structuredData.products.every((p) => Object.keys(p).length === 0)
    )
      structuredData.products = [];
    if (
      structuredData.contact &&
      Object.keys(structuredData.contact).length === 0
    )
      delete structuredData.contact;

    return structuredData;
  };

  const callAIGenerationFromText = async (
    textInput: string,
    parameters: Parameters
  ) => {
    const systemPrompt = `
您是一位擁有 15 年經驗的「國際SEO專家 & 數位行銷顧問」，專精於搜尋引擎優化、內容行銷、競爭分析和多語言網站策略。
您的任務是根據客戶提供的「公司/產品資訊」和「行銷參數」，創建一個完整的SEO優化專業網站文案系統。

**核心任務說明：**
您必須同時產生 1) 網站文案內容 2) 完整SEO策略 3) 結構化資料標記，確保網站在搜尋引擎中獲得最佳排名表現。

**必須嚴格遵守以下規則：**

1. **理解與分析原始資料：**
   * 深度分析客戶提供的公司簡介、產品資訊、服務內容
   * 識別核心業務價值、競爭優勢、目標客戶群
   * 提取關鍵實體：公司名稱、產品名稱、服務類別、地理位置等

2. **受眾導向內容策略：**
   * B2B：專業術語、ROI 導向、解決方案思維、權威性建立
   * B2C：情感連接、用戶體驗、生活場景、價值感知

3. **多語言本地化 & SEO：**
   * 目標語言文案必須符合當地搜尋習慣和文化背景
   * 關鍵字佈局要符合當地使用者搜尋意圖
   * **雙語輸出規則：**
     - 非中文市場：提供目標語言 + 中文翻譯（_zh 欄位）
     - 中文市場：僅提供優化後的中文內容

4. **SEO 技術優化（必須完成）：**
   * **Meta Tags 優化：**
     - Meta Description：120-160字元，包含核心關鍵字
     - Meta Keywords：5-10個精準關鍵字
     - Open Graph 標籤：提升社群分享效果
   
   * **關鍵字策略：**
     - 主關鍵字：3-5個高競爭核心詞
     - 長尾關鍵字：10-15個具體搜尋詞組
     - 關鍵字密度分析：建議最佳密度 2-4%
   
   * **內容結構優化：**
     - H2/H3 標題建議：符合語意化架構
     - 內容長度分析：每區塊最佳字數建議
     - 可讀性評分：提供改善建議

5. **競爭分析與市場洞察（必須執行）：**
   * 分析行業關鍵字趨勢
   * 識別競爭空白機會
   * 提供差異化定位建議
   * USP 強化策略

6. **結構化資料標記（Schema.org）：**
   * Organization：公司實體資訊
   * Products：產品結構化標記
   * WebSite：網站搜尋功能標記

7. **完整JSON輸出格式：**（新增支援欄位：Hero.ctaButtonLink、About.image、solutions[]）

{
  "hero": { "title":"", "description":"", "ctaButtonText":"", "ctaButtonLink":"", "title_zh":"", "description_zh":"", "ctaButtonText_zh":"" },
  "about": { "badge":"", "title":"", "description":"", "image":"", "badge_zh":"", "title_zh":"", "description_zh":"" },
  "solutions": [ { "badge":"", "title":"", "description":"", "badge_zh":"", "title_zh":"", "description_zh":"" } ],
  "products": [ { 基礎網站區塊 } ],
  "contact": { 基礎網站區塊 },
  
  "seo": {
    "metaDescription": "SEO優化的網站描述",
    "metaKeywords": "關鍵字1,關鍵字2,關鍵字3",
    "ogTitle": "社群分享標題",
    "ogDescription": "社群分享描述",
    "ogType": "website",
    
    "h2Suggestions": ["建議的H2標題1", "建議的H2標題2"],
    "h3Suggestions": ["建議的H3標題1", "建議的H3標題2"],
    
    "primaryKeywords": ["核心關鍵字1", "核心關鍵字2"],
    "longTailKeywords": ["長尾關鍵字詞組1", "長尾關鍵字詞組2"],
    "keywordDensity": [
      {"keyword": "關鍵字", "density": 3.2, "recommendation": "密度適中，建議維持"}
    ],
    
    "competitorAnalysis": {
      "industry": "行業分類",
      "competitorKeywords": ["競爭對手常用關鍵字"],
      "gapAnalysis": "市場機會分析",
      "recommendations": "競爭策略建議"
    },
    
    "uspAnalysis": {
      "uniqueSellingPoints": ["獨特賣點1", "獨特賣點2"],
      "differentiationStrategy": "差異化策略",
      "positioningStatement": "品牌定位陳述"
    },
    
    "contentOptimization": {
      "titleLength": {
        "current": 45,
        "recommended": "建議標題長度50-60字元以內"
      },
      "descriptionLength": {
        "current": 120,
        "recommended": "建議描述長度150-160字元"
      },
      "readabilityScore": {
        "score": 85,
        "suggestions": "內容易讀性良好，建議加入更多行動呼籲"
      }
    }
  },
  
  "structuredData": {
    "organization": {
      "type": "Organization",
      "name": "公司名稱",
      "description": "公司描述",
      "url": "https://example.com",
      "contactPoint": {
        "telephone": "+886-xxx-xxxx",
        "contactType": "customer service"
      }
    },
    "products": [
      {
        "type": "Product",
        "name": "產品名稱",
        "description": "產品描述",
        "brand": "品牌名稱"
      }
    ],
    "website": {
      "type": "WebSite",
      "url": "https://example.com",
      "name": "網站名稱",
      "description": "網站描述"
    }
  }
}

**重要提醒：**
- 確保所有SEO建議都基於最新的搜尋引擎演算法
- 關鍵字佈局要自然，避免關鍵字堆砌
- 結構化資料必須符合 Schema.org 規範
- 內容必須原創且具有價值，避免AI痕跡過重
`;

    const userPrompt = `
請根據以下客戶提供的資訊，創建一個完整的專業網站文案：

**客戶提供的資訊:**
${textInput}

**行銷參數:**
* 目標人群 (Audience): ${parameters.audience}
* 目標市場 (Language): ${parameters.language}
* 行銷重點 (Focus): ${parameters.focus}
* 必提內容 (Keywords): ${parameters.keywords}

請分析客戶提供的資訊，提取關鍵內容，並生成符合目標市場和受眾的專業網站文案。
確保文案具有吸引力、專業性，並符合 SEO 最佳實踐。
`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    try {
      const response = await fetch(genaiApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API 請求失敗: ${response.status} ${errorBody}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text;
        const parsedData = robustParseModelJson(aiResponseText);
        setGeneratedCopyData(parsedData);

        updateStatus("AI 文案生成完畢！您現在可以下載輸出檔。", "success");
        setIsLoading(false);
      } else {
        throw new Error("AI 未回傳有效的文案內容。");
      }
    } catch (error) {
      console.error("AI 生成失敗:", error);
      updateStatus(
        `AI 生成失敗: ${error instanceof Error ? error.message : "未知錯誤"}。請檢查控制台(F12)獲取詳細資訊。`,
        "error"
      );
      setIsLoading(false);
    }
  };

  const callAIGeneration = async (
    rawDataJson: StructuredData,
    parameters: Parameters
  ) => {
    const systemPrompt = `
您是一位擁有 15 年經驗的「國際SEO專家 & 數位行銷顧問」，專精於搜尋引擎優化、內容行銷、競爭分析和多語言網站策略。
您的任務是基於客戶提供的「原始CSV資料」和「行銷參數」，創建一個完整的SEO優化專業網站文案系統。

**核心任務說明：**
您必須同時產生 1) 優化後的網站文案內容 2) 完整SEO策略分析 3) 結構化資料標記，確保網站在搜尋引擎中獲得最佳排名表現。

**必須嚴格遵守以下規則：**

1. **原始資料優化與分析：**
   * 分析客戶CSV中的現有文案，識別SEO優化機會
   * 保留品牌核心價值，同時提升搜尋引擎可見性
   * 根據行業特性和目標市場調整內容策略

2. **受眾導向SEO內容策略：**
   * B2B：專業關鍵字、行業術語、解決方案導向的長尾關鍵字
   * B2C：生活化關鍵字、情感觸發詞、購買意圖關鍵字

3. **多語言SEO本地化：**
   * 目標語言文案必須符合當地搜尋引擎優化最佳實踐
   * 關鍵字研究要基於目標市場的搜尋習慣
   * **雙語輸出規則：**
     - 非中文市場：提供目標語言SEO文案 + 中文翻譯（_zh 欄位）
     - 中文市場：提供SEO優化後的中文內容

4. **SEO 技術優化（必須完成）：**
   * **Meta Tags 優化：**
     - Meta Description：120-160字元，包含核心關鍵字
     - Meta Keywords：5-10個精準關鍵字
     - Open Graph 標籤：提升社群分享效果
   
   * **關鍵字策略：**
     - 主關鍵字：3-5個高競爭核心詞
     - 長尾關鍵字：10-15個具體搜尋詞組
     - 關鍵字密度分析：建議最佳密度 2-4%
   
   * **內容結構優化：**
     - H2/H3 標題建議：符合語意化架構
     - 內容長度分析：每區塊最佳字數建議
     - 可讀性評分：提供改善建議

5. **競爭分析與市場洞察（必須執行）：**
   * 基於原始內容分析所屬行業
   * 識別競爭空白機會和關鍵字缺口
   * 提供差異化定位建議
   * USP 強化策略

6. **結構化資料標記（Schema.org）：**
   * Organization：公司實體資訊
   * Products：產品結構化標記  
   * WebSite：網站搜尋功能標記

7. **完整JSON輸出格式（必須包含所有區塊）：**（新增支援欄位：Hero.ctaButtonLink、About.image、solutions[]）

{
  "hero": { "title":"", "description":"", "ctaButtonText":"", "ctaButtonLink":"", "title_zh":"", "description_zh":"", "ctaButtonText_zh":"" },
  "about": { "badge":"", "title":"", "description":"", "image":"", "badge_zh":"", "title_zh":"", "description_zh":"" },
  "solutions": [ { "badge":"", "title":"", "description":"", "badge_zh":"", "title_zh":"", "description_zh":"" } ],
  "products": [ { 優化後的網站區塊 } ],
  "contact": { 優化後的網站區塊 },
  
  "seo": {
    "metaDescription": "SEO優化的網站描述",
    "metaKeywords": "關鍵字1,關鍵字2,關鍵字3",
    "ogTitle": "社群分享標題",
    "ogDescription": "社群分享描述",
    "ogType": "website",
    
    "h2Suggestions": ["建議的H2標題1", "建議的H2標題2"],
    "h3Suggestions": ["建議的H3標題1", "建議的H3標題2"],
    
    "primaryKeywords": ["核心關鍵字1", "核心關鍵字2"],
    "longTailKeywords": ["長尾關鍵字詞組1", "長尾關鍵字詞組2"],
    "keywordDensity": [
      {"keyword": "關鍵字", "density": 3.2, "recommendation": "密度適中，建議維持"}
    ],
    
    "competitorAnalysis": {
      "industry": "行業分類",
      "competitorKeywords": ["競爭對手常用關鍵字"],
      "gapAnalysis": "市場機會分析",
      "recommendations": "競爭策略建議"
    },
    
    "uspAnalysis": {
      "uniqueSellingPoints": ["獨特賣點1", "獨特賣點2"],
      "differentiationStrategy": "差異化策略",
      "positioningStatement": "品牌定位陳述"
    },
    
    "contentOptimization": {
      "titleLength": {
        "current": 45,
        "recommended": "建議標題長度50-60字元以內"
      },
      "descriptionLength": {
        "current": 120,
        "recommended": "建議描述長度150-160字元"
      },
      "readabilityScore": {
        "score": 85,
        "suggestions": "內容易讀性良好，建議加入更多行動呼籲"
      }
    }
  },
  
  "structuredData": {
    "organization": {
      "type": "Organization",
      "name": "公司名稱",
      "description": "公司描述",
      "url": "https://example.com",
      "contactPoint": {
        "telephone": "+886-xxx-xxxx",
        "contactType": "customer service"
      }
    },
    "products": [
      {
        "type": "Product",
        "name": "產品名稱",
        "description": "產品描述",
        "brand": "品牌名稱"
      }
    ],
    "website": {
      "type": "WebSite",
      "url": "https://example.com",
      "name": "網站名稱",
      "description": "網站描述"
    }
  }
}

**重要提醒：**
- 確保所有SEO建議都基於最新的搜尋引擎演算法
- 關鍵字佈局要自然，避免關鍵字堆砌
- 結構化資料必須符合 Schema.org 規範
- 內容必須原創且具有價值，避免AI痕跡過重
- 必須同時輸出所有欄位：hero, about, products, contact, seo, structuredData
`;

    const userPrompt = `
請根據以下資料和參數生成文案：

**階段 1：原始資料 (JSON 格式):**
\`\`\`json
${JSON.stringify(rawDataJson, null, 2)}
\`\`\`

**階段 2：參數設定:**
* 目標人群 (Audience): ${parameters.audience}
* 目標市場 (Language): ${parameters.language}
* 行銷重點 (Focus): ${parameters.focus}
* 必提內容 (Keywords): ${parameters.keywords}

請嚴格按照系統指令中的「輸出格式」規則，僅回傳 JSON 物件。
`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    try {
      const response = await fetch(genaiApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API 請求失敗: ${response.status} ${errorBody}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text;
        const parsedData = robustParseModelJson(aiResponseText);
        setGeneratedCopyData(parsedData);

        updateStatus("AI 文案生成完畢！您現在可以下載輸出檔。", "success");
        setIsLoading(false);
      } else {
        throw new Error("AI 未回傳有效的文案內容。");
      }
    } catch (error) {
      console.error("AI 生成失敗:", error);
      updateStatus(
        `AI 生成失敗: ${error instanceof Error ? error.message : "未知錯誤"}。請檢查控制台(F12)獲取詳細資訊。`,
        "error"
      );
      setIsLoading(false);
    }
  };

  const handleGeneration = () => {
    const parameters: Parameters = {
      audience: targetAudience,
      language: targetLanguage,
      focus: marketingFocus,
      keywords: requiredKeywords || "無",
      // SEO 擴展參數
      industryCategory: industryCategory.trim() || "未指定",
      targetLocation: targetLocation.trim() || "全球",
      businessType: businessType.trim() || "一般企業",
      competitorUrls: competitorUrls.trim() || "",
      seoMode: seoMode,
      contentLength: contentLength,
    };

    if (inputMode === "text") {
      // 智能輸入模式
      if (!textInput.trim() && !websiteUrl.trim()) {
        updateStatus("請輸入公司/產品描述或網站連結。", "error");
        return;
      }

      setIsLoading(true);
      updateStatus("正在使用 AI 解析您的資料...", "loading");

      // 直接將文字輸入傳給 AI
      const inputContent = websiteUrl.trim()
        ? `網站連結：${websiteUrl}\n\n${textInput.trim()}`
        : textInput.trim();

      callAIGenerationFromText(inputContent, parameters);
    } else {
      // CSV 上傳模式
      if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) {
        updateStatus("請先上傳 CSV 檔案。", "error");
        return;
      }

      const file = fileInputRef.current.files[0];
      setIsLoading(true);
      updateStatus("正在解析 CSV 檔案...", "loading");

      Papa.parse(file, {
        encoding: "UTF-8",
        complete: function (results: Papa.ParseResult<string[]>) {
          const csvData = results.data as string[][];
          setOriginalCsvStructure(csvData);

          try {
            const rawDataJson = parseCsvToStructuredJson(csvData);

            if (Object.keys(rawDataJson).length === 0) {
              throw new Error(
                "無法從 CSV 中解析出有效區塊 (如 Hero, About Us)。請檢查 CSV 格式是否符合範本。"
              );
            }

            updateStatus("CSV 解析完成，正在呼叫 AI 生成文案...", "loading");
            callAIGeneration(rawDataJson, parameters);
          } catch (error) {
            console.error("CSV 解析失敗:", error);
            updateStatus(
              `CSV 解析失敗: ${error instanceof Error ? error.message : "未知錯誤"}`,
              "error"
            );
            setIsLoading(false);
          }
        },
        error: function (err: Error) {
          console.error("PapaParse 錯誤:", err);
          updateStatus("讀取 CSV 檔案時發生錯誤。", "error");
          setIsLoading(false);
        },
      });
    }
  };

  const createOutputCsvData = (
    originalData: string[][],
    aiData: StructuredData,
    targetLanguageName: string
  ): string[][] => {
    const newData = originalData.map((row) => [...row]);
    const isChinese = targetLanguage === "zh-TW" || targetLanguage === "zh-CN";

    if (newData.length > 0) {
      const headerRowIndex = newData.findIndex(
        (row) => row[4] && row[4].includes("客戶填寫")
      );
      if (headerRowIndex !== -1) {
        newData[headerRowIndex][4] = "客戶原文 (Original)";
        newData[headerRowIndex][5] = `AI 生成文案 (${targetLanguageName})`;
        if (!isChinese) {
          newData[headerRowIndex][6] = "中文翻譯 (Chinese Translation)";
        }
      }
    }

    let currentSection: string | null = null;
    let currentProductIndex = -1;

    for (const row of newData) {
      const sectionHeader = row[0] ? row[0].trim() : "";
      const itemCode = row[1] ? row[1].trim() : "";

      if (sectionHeader.startsWith("Hero")) {
        currentSection = "hero";
        continue;
      }
      if (sectionHeader.startsWith("About Us")) {
        currentSection = "about";
        continue;
      }
      if (sectionHeader.startsWith("carousel")) {
        currentSection = "product";
        currentProductIndex++;
        continue;
      }
      if (sectionHeader.startsWith("Contact Us")) {
        currentSection = "contact";
        continue;
      }

      switch (currentSection) {
        case "hero":
          if (itemCode === "A") {
            row[5] = aiData.hero?.title || "";
            if (!isChinese) row[6] = aiData.hero?.title_zh || "";
          }
          if (itemCode === "B") {
            row[5] = aiData.hero?.description || "";
            if (!isChinese) row[6] = aiData.hero?.description_zh || "";
          }
          if (itemCode === "C") {
            row[5] = aiData.hero?.ctaButtonText || "";
            if (!isChinese) row[6] = aiData.hero?.ctaButtonText_zh || "";
          }
          if (itemCode === "D") {
            row[5] = aiData.hero?.ctaButtonLink || "";
          }
          break;
        case "about":
          if (itemCode === "A") {
            row[5] = aiData.about?.badge || "";
            if (!isChinese) row[6] = aiData.about?.badge_zh || "";
          }
          if (itemCode === "B") {
            row[5] = aiData.about?.title || "";
            if (!isChinese) row[6] = aiData.about?.title_zh || "";
          }
          if (itemCode === "C") {
            row[5] = aiData.about?.description || "";
            if (!isChinese) row[6] = aiData.about?.description_zh || "";
          }
          if (itemCode === "D") {
            row[5] = aiData.about?.image || "";
          }
          break;
        case "product":
          if (
            currentProductIndex > -1 &&
            aiData.products &&
            aiData.products[currentProductIndex]
          ) {
            const product = aiData.products[currentProductIndex];
            if (itemCode === "A") {
              row[5] = product.title || "";
              if (!isChinese) row[6] = product.title_zh || "";
            }
            if (itemCode === "B") {
              row[5] = product.shortDescription || "";
              if (!isChinese) row[6] = product.shortDescription_zh || "";
            }
            if (itemCode === "C") {
              row[5] = product.completeDescription || "";
              if (!isChinese) row[6] = product.completeDescription_zh || "";
            }
          }
          break;
        case "contact":
          if (itemCode === "A") {
            row[5] = aiData.contact?.badge || "";
            if (!isChinese) row[6] = aiData.contact?.badge_zh || "";
          }
          if (itemCode === "B") {
            row[5] = aiData.contact?.title || "";
            if (!isChinese) row[6] = aiData.contact?.title_zh || "";
          }
          if (itemCode === "C") {
            row[5] = aiData.contact?.description || "";
            if (!isChinese) row[6] = aiData.contact?.description_zh || "";
          }
          break;
      }
    }

    // 在末尾追加自訂區塊（Solution、SEO、Schema）
    // Solution
    if (aiData.solutions && aiData.solutions.length > 0) {
      newData.push(["", "", "", "", "", ""], ["Solution", "", "", "", "", ""]);
      aiData.solutions.forEach((s, index) => {
        newData.push(
          ["Solution", "", `方案 ${index + 1}`, "", "", ""],
          isChinese
            ? ["Solution", "A", "標籤", "", s.badge || ""]
            : ["Solution", "A", "標籤", "", s.badge || "", s.badge_zh || ""],
          isChinese
            ? ["Solution", "B", "標題", "", s.title || ""]
            : ["Solution", "B", "標題", "", s.title || "", s.title_zh || ""],
          isChinese
            ? ["Solution", "C", "敘述", "", s.description || ""]
            : ["Solution", "C", "敘述", "", s.description || "", s.description_zh || ""],
          ["", "", "", "", "", ""]
        );
      });
    }

    // 添加SEO區塊到現有CSV結構的末尾
    if (aiData.seo || aiData.structuredData) {
      // 添加分隔行
      newData.push(["", "", "", "", "", ""]);
      newData.push(["", "", "", "", "", ""]);
      
      if (aiData.seo) {
        // 添加SEO優化區塊
        newData.push(
          ["=== SEO 優化分析 ===", "", "", "", "", ""],
          ["", "", "", "", "", ""],
          ["SEO Meta Tags", "", "", "", "", ""],
          isChinese
            ? ["SEO Meta Tags", "A", "網站描述 (Meta Description)", "", aiData.seo.metaDescription || ""]
            : ["SEO Meta Tags", "A", "網站描述 (Meta Description)", "", aiData.seo.metaDescription || "", aiData.seo.metaDescription_zh || ""],
          isChinese
            ? ["SEO Meta Tags", "B", "關鍵字 (Meta Keywords)", "", aiData.seo.metaKeywords || ""]
            : ["SEO Meta Tags", "B", "關鍵字 (Meta Keywords)", "", aiData.seo.metaKeywords || "", aiData.seo.metaKeywords_zh || ""],
          isChinese
            ? ["SEO Meta Tags", "C", "社群分享標題 (OG Title)", "", aiData.seo.ogTitle || ""]
            : ["SEO Meta Tags", "C", "社群分享標題 (OG Title)", "", aiData.seo.ogTitle || "", aiData.seo.ogTitle_zh || ""],
          ["", "", "", "", "", ""],
          
          ["關鍵字策略", "", "", "", "", ""],
          isChinese
            ? ["關鍵字策略", "A", "主要關鍵字", "", (aiData.seo.primaryKeywords || []).join(", ") || ""]
            : ["關鍵字策略", "A", "主要關鍵字", "", (aiData.seo.primaryKeywords || []).join(", ") || "", (aiData.seo.primaryKeywords_zh || []).join(", ") || ""],
          isChinese
            ? ["關鍵字策略", "B", "長尾關鍵字", "", (aiData.seo.longTailKeywords || []).join(", ") || ""]
            : ["關鍵字策略", "B", "長尾關鍵字", "", (aiData.seo.longTailKeywords || []).join(", ") || "", (aiData.seo.longTailKeywords_zh || []).join(", ") || ""],
          ["", "", "", "", "", ""]
        );

        // 競爭分析
        if (aiData.seo.competitorAnalysis) {
          newData.push(
            ["競爭分析", "", "", "", "", ""],
            isChinese
              ? ["競爭分析", "A", "行業分類", "", aiData.seo.competitorAnalysis.industry || ""]
              : ["競爭分析", "A", "行業分類", "", aiData.seo.competitorAnalysis.industry || "", aiData.seo.competitorAnalysis.industry_zh || ""],
            isChinese
              ? ["競爭分析", "B", "市場機會分析", "", aiData.seo.competitorAnalysis.gapAnalysis || ""]
              : ["競爭分析", "B", "市場機會分析", "", aiData.seo.competitorAnalysis.gapAnalysis || "", aiData.seo.competitorAnalysis.gapAnalysis_zh || ""],
            isChinese
              ? ["競爭分析", "C", "競爭策略建議", "", aiData.seo.competitorAnalysis.recommendations || ""]
              : ["競爭分析", "C", "競爭策略建議", "", aiData.seo.competitorAnalysis.recommendations || "", aiData.seo.competitorAnalysis.recommendations_zh || ""],
            ["", "", "", "", "", ""]
          );
        }

        // USP分析
        if (aiData.seo.uspAnalysis) {
          newData.push(
            ["USP差異化分析", "", "", "", "", ""],
            isChinese
              ? ["USP差異化分析", "A", "獨特賣點", "", (aiData.seo.uspAnalysis.uniqueSellingPoints || []).join(" | ") || ""]
              : ["USP差異化分析", "A", "獨特賣點", "", (aiData.seo.uspAnalysis.uniqueSellingPoints || []).join(" | ") || "", (aiData.seo.uspAnalysis.uniqueSellingPoints_zh || []).join(" | ") || ""],
            isChinese
              ? ["USP差異化分析", "B", "差異化策略", "", aiData.seo.uspAnalysis.differentiationStrategy || ""]
              : ["USP差異化分析", "B", "差異化策略", "", aiData.seo.uspAnalysis.differentiationStrategy || "", aiData.seo.uspAnalysis.differentiationStrategy_zh || ""],
            ["", "", "", "", "", ""]
          );
        }

        // 內容優化建議
        if (aiData.seo.contentOptimization) {
          newData.push(
            ["內容優化建議", "", "", "", "", ""],
            isChinese
              ? ["內容優化建議", "A", `標題長度建議`, "", aiData.seo.contentOptimization.titleLength?.recommended || ""]
              : ["內容優化建議", "A", `標題長度建議`, "", aiData.seo.contentOptimization.titleLength?.recommended || "", aiData.seo.contentOptimization.titleLength?.recommendation_zh || ""],
            isChinese
              ? ["內容優化建議", "B", `描述長度建議`, "", aiData.seo.contentOptimization.descriptionLength?.recommended || ""]
              : ["內容優化建議", "B", `描述長度建議`, "", aiData.seo.contentOptimization.descriptionLength?.recommended || "", aiData.seo.contentOptimization.descriptionLength?.recommendation_zh || ""],
            isChinese
              ? ["內容優化建議", "C", `可讀性建議`, "", aiData.seo.contentOptimization.readabilityScore?.suggestions || ""]
              : ["內容優化建議", "C", `可讀性建議`, "", aiData.seo.contentOptimization.readabilityScore?.suggestions || "", aiData.seo.contentOptimization.readabilityScore?.suggestions_zh || ""],
            ["", "", "", "", "", ""]
          );
        }
      }

      // 結構化資料區塊
      if (aiData.structuredData) {
        newData.push(
          ["=== 結構化資料 (Schema.org) ===", "", "", "", "", ""],
          ["", "", "", "", "", ""],
          ["組織資訊", "", "", "", "", ""],
          ["組織資訊", "A", "類型", "", aiData.structuredData.organization?.type || ""],
          ["組織資訊", "B", "名稱", "", aiData.structuredData.organization?.name || ""],
          ["組織資訊", "C", "描述", "", aiData.structuredData.organization?.description || ""],
          ["組織資訊", "D", "網址", "", aiData.structuredData.organization?.url || ""],
          ["", "", "", "", "", ""]
        );

        // 網站資訊
        newData.push(
          ["網站資訊", "", "", "", "", ""],
          ["網站資訊", "A", "類型", "", aiData.structuredData.website?.type || ""],
          ["網站資訊", "B", "網址", "", aiData.structuredData.website?.url || ""],
          ["網站資訊", "C", "名稱", "", aiData.structuredData.website?.name || ""],
          ["網站資訊", "D", "描述", "", aiData.structuredData.website?.description || ""],
          ["", "", "", "", "", ""]
        );
      }
    }

    return newData;
  };

  const handleDownload = () => {
    if (!generatedCopyData) {
      updateStatus("沒有可下載的資料。", "error");
      return;
    }

    updateStatus("正在產生 CSV 檔案...", "loading");

    try {
      const languageOptions: Record<string, string> = {
        "zh-TW": "繁體中文 (台灣)",
        "zh-CN": "简体中文 (中國)",
        "en-US": "English (美國)",
        en: "English (通用)",
        ja: "日本語 (日本)",
        ko: "한국어 (韓國)",
        de: "Deutsch (德國)",
        fr: "Français (法國)",
        it: "Italiano (義大利)",
        th: "ภาษาไทย (泰國)",
        vi: "Tiếng Việt (越南)",
      };

      const targetLanguageName = languageOptions[targetLanguage] || targetLanguage;

      let outputCsvData: string[][];

      if (inputMode === "csv" && originalCsvStructure) {
        // CSV 模式：使用原始結構
        outputCsvData = createOutputCsvData(
          originalCsvStructure,
          generatedCopyData,
          targetLanguageName
        );
      } else {
        // 智能輸入模式：創建新的 CSV 結構
        outputCsvData = createOutputCsvFromAI(generatedCopyData, targetLanguageName);
      }

      const csvString = Papa.unparse(outputCsvData);

      const blob = new Blob(
        [new Uint8Array([0xef, 0xbb, 0xbf]), csvString],
        { type: "text/csv;charset=utf-8;" }
      );
      saveAs(blob, "TourPage_AI_Output.csv");

      updateStatus("CSV 檔案已下載！", "success");
    } catch (error) {
      console.error("CSV 產生失敗:", error);
      updateStatus(
        `CSV 產生失敗: ${error instanceof Error ? error.message : "未知錯誤"}`,
        "error"
      );
    }
  };

  const createOutputCsvFromAI = (
    aiData: StructuredData,
    targetLanguageName: string
  ): string[][] => {
    const isChinese = targetLanguage === "zh-TW" || targetLanguage === "zh-CN";

    const csvData: string[][] = [
      isChinese
        ? ["區塊名稱", "項目代碼", "項目說明", `AI 生成文案 (${targetLanguageName})`]
        : ["區塊名稱", "項目代碼", "項目說明", `AI 生成文案 (${targetLanguageName})`, "中文翻譯"],
      ["", "", "", ""],
      
      // 基礎內容區塊
      ["=== 網站內容區塊 ===", "", "", ""],
      ["", "", "", ""],
      ["Hero", "", "", ""],
      isChinese
        ? ["Hero", "A", "主標題", aiData.hero?.title || ""]
        : ["Hero", "A", "主標題", aiData.hero?.title || "", aiData.hero?.title_zh || ""],
      isChinese
        ? ["Hero", "B", "副標題描述", aiData.hero?.description || ""]
        : ["Hero", "B", "副標題描述", aiData.hero?.description || "", aiData.hero?.description_zh || ""],
      isChinese
        ? ["Hero", "C", "CTA 按鈕文字", aiData.hero?.ctaButtonText || ""]
        : ["Hero", "C", "CTA 按鈕文字", aiData.hero?.ctaButtonText || "", aiData.hero?.ctaButtonText_zh || ""],
      ["Hero", "D", "CTA 連結", aiData.hero?.ctaButtonLink || ""],
      ["", "", "", ""],
      ["About Us", "", "", ""],
      isChinese
        ? ["About Us", "A", "標籤", aiData.about?.badge || ""]
        : ["About Us", "A", "標籤", aiData.about?.badge || "", aiData.about?.badge_zh || ""],
      isChinese
        ? ["About Us", "B", "標題", aiData.about?.title || ""]
        : ["About Us", "B", "標題", aiData.about?.title || "", aiData.about?.title_zh || ""],
      isChinese
        ? ["About Us", "C", "描述內容", aiData.about?.description || ""]
        : ["About Us", "C", "描述內容", aiData.about?.description || "", aiData.about?.description_zh || ""],
      ["About Us", "D", "圖片 (URL)", aiData.about?.image || ""],
      ["", "", "", ""],
    ];

    // 添加產品區塊
    if (aiData.products && aiData.products.length > 0) {
      aiData.products.forEach((product, index) => {
        csvData.push(
          ["carousel", "", "", `產品 ${index + 1}`],
          isChinese
            ? ["carousel", "A", "產品標題", product.title || ""]
            : ["carousel", "A", "產品標題", product.title || "", product.title_zh || ""],
          isChinese
            ? ["carousel", "B", "簡短描述", product.shortDescription || ""]
            : ["carousel", "B", "簡短描述", product.shortDescription || "", product.shortDescription_zh || ""],
          isChinese
            ? ["carousel", "C", "完整描述", product.completeDescription || ""]
            : ["carousel", "C", "完整描述", product.completeDescription || "", product.completeDescription_zh || ""],
          ["", "", "", ""]
        );
      });
    }

    // Solution 區塊（若有）
    if (aiData.solutions && aiData.solutions.length > 0) {
      csvData.push(["Solution", "", "", ""]);
      aiData.solutions.forEach((s, index) => {
        csvData.push(
          ["Solution", "", "", `方案 ${index + 1}`],
          isChinese ? ["Solution", "A", "標籤", s.badge || ""] : ["Solution", "A", "標籤", s.badge || "", s.badge_zh || ""],
          isChinese ? ["Solution", "B", "標題", s.title || ""] : ["Solution", "B", "標題", s.title || "", s.title_zh || ""],
          isChinese ? ["Solution", "C", "敘述", s.description || ""] : ["Solution", "C", "敘述", s.description || "", s.description_zh || ""],
          ["", "", "", ""]
        );
      });
    }

    // 添加聯絡區塊
    csvData.push(
      ["Contact Us", "", "", ""],
      isChinese
        ? ["Contact Us", "A", "標籤", aiData.contact?.badge || ""]
        : ["Contact Us", "A", "標籤", aiData.contact?.badge || "", aiData.contact?.badge_zh || ""],
      isChinese
        ? ["Contact Us", "B", "標題", aiData.contact?.title || ""]
        : ["Contact Us", "B", "標題", aiData.contact?.title || "", aiData.contact?.title_zh || ""],
      isChinese
        ? ["Contact Us", "C", "描述", aiData.contact?.description || ""]
        : ["Contact Us", "C", "描述", aiData.contact?.description || "", aiData.contact?.description_zh || ""],
      ["", "", "", ""],
      ["", "", "", ""]
    );

    // 添加SEO優化區塊
    if (aiData.seo) {
      csvData.push(
        ["=== SEO 優化分析 ===", "", "", ""],
        ["", "", "", ""],
        ["SEO Meta Tags", "", "", ""],
        isChinese
          ? ["SEO Meta Tags", "A", "網站描述 (Meta Description)", aiData.seo.metaDescription || ""]
          : ["SEO Meta Tags", "A", "網站描述 (Meta Description)", aiData.seo.metaDescription || "", aiData.seo.metaDescription_zh || ""],
        isChinese
          ? ["SEO Meta Tags", "B", "關鍵字 (Meta Keywords)", aiData.seo.metaKeywords || ""]
          : ["SEO Meta Tags", "B", "關鍵字 (Meta Keywords)", aiData.seo.metaKeywords || "", aiData.seo.metaKeywords_zh || ""],
        isChinese
          ? ["SEO Meta Tags", "C", "社群分享標題 (OG Title)", aiData.seo.ogTitle || ""]
          : ["SEO Meta Tags", "C", "社群分享標題 (OG Title)", aiData.seo.ogTitle || "", aiData.seo.ogTitle_zh || ""],
        isChinese
          ? ["SEO Meta Tags", "D", "社群分享描述 (OG Description)", aiData.seo.ogDescription || ""]
          : ["SEO Meta Tags", "D", "社群分享描述 (OG Description)", aiData.seo.ogDescription || "", aiData.seo.ogDescription_zh || ""],
        ["", "", "", ""],
        
        ["SEO 內容結構", "", "", ""],
        isChinese
          ? ["SEO 內容結構", "A", "建議H2標題", (aiData.seo.h2Suggestions || []).join(" | ") || ""]
          : ["SEO 內容結構", "A", "建議H2標題", (aiData.seo.h2Suggestions || []).join(" | ") || "", (aiData.seo.h2Suggestions_zh || []).join(" | ") || ""],
        isChinese
          ? ["SEO 內容結構", "B", "建議H3標題", (aiData.seo.h3Suggestions || []).join(" | ") || ""]
          : ["SEO 內容結構", "B", "建議H3標題", (aiData.seo.h3Suggestions || []).join(" | ") || "", (aiData.seo.h3Suggestions_zh || []).join(" | ") || ""],
        ["", "", "", ""],
        
        ["關鍵字策略", "", "", ""],
        isChinese
          ? ["關鍵字策略", "A", "主要關鍵字", (aiData.seo.primaryKeywords || []).join(", ") || ""]
          : ["關鍵字策略", "A", "主要關鍵字", (aiData.seo.primaryKeywords || []).join(", ") || "", (aiData.seo.primaryKeywords_zh || []).join(", ") || ""],
        isChinese
          ? ["關鍵字策略", "B", "長尾關鍵字", (aiData.seo.longTailKeywords || []).join(", ") || ""]
          : ["關鍵字策略", "B", "長尾關鍵字", (aiData.seo.longTailKeywords || []).join(", ") || "", (aiData.seo.longTailKeywords_zh || []).join(", ") || ""],
        ["", "", "", ""]
      );

      // 關鍵字密度分析
      if (aiData.seo.keywordDensity && aiData.seo.keywordDensity.length > 0) {
        csvData.push(["關鍵字密度分析", "", "", ""]);
        aiData.seo.keywordDensity.forEach((kd, index) => {
          csvData.push([
            "關鍵字密度分析", 
            String.fromCharCode(65 + index), // A, B, C...
            `${kd.keyword} (${kd.density}%)`, 
            kd.recommendation,
            isChinese ? "" : kd.recommendation // 假設建議已經是中文
          ]);
        });
        csvData.push(["", "", "", ""]);
      }

      // 競爭分析
      if (aiData.seo.competitorAnalysis) {
        csvData.push(
          ["競爭分析", "", "", ""],
          isChinese
            ? ["競爭分析", "A", "行業分類", aiData.seo.competitorAnalysis.industry || ""]
            : ["競爭分析", "A", "行業分類", aiData.seo.competitorAnalysis.industry || "", aiData.seo.competitorAnalysis.industry_zh || ""],
          isChinese
            ? ["競爭分析", "B", "競爭對手關鍵字", (aiData.seo.competitorAnalysis.competitorKeywords || []).join(", ") || ""]
            : ["競爭分析", "B", "競爭對手關鍵字", (aiData.seo.competitorAnalysis.competitorKeywords || []).join(", ") || "", (aiData.seo.competitorAnalysis.competitorKeywords_zh || []).join(", ") || ""],
          isChinese
            ? ["競爭分析", "C", "市場機會分析", aiData.seo.competitorAnalysis.gapAnalysis || ""]
            : ["競爭分析", "C", "市場機會分析", aiData.seo.competitorAnalysis.gapAnalysis || "", aiData.seo.competitorAnalysis.gapAnalysis_zh || ""],
          isChinese
            ? ["競爭分析", "D", "競爭策略建議", aiData.seo.competitorAnalysis.recommendations || ""]
            : ["競爭分析", "D", "競爭策略建議", aiData.seo.competitorAnalysis.recommendations || "", aiData.seo.competitorAnalysis.recommendations_zh || ""],
          ["", "", "", ""]
        );
      }

      // USP分析
      if (aiData.seo.uspAnalysis) {
        csvData.push(
          ["USP差異化分析", "", "", ""],
          isChinese
            ? ["USP差異化分析", "A", "獨特賣點", (aiData.seo.uspAnalysis.uniqueSellingPoints || []).join(" | ") || ""]
            : ["USP差異化分析", "A", "獨特賣點", (aiData.seo.uspAnalysis.uniqueSellingPoints || []).join(" | ") || "", (aiData.seo.uspAnalysis.uniqueSellingPoints_zh || []).join(" | ") || ""],
          isChinese
            ? ["USP差異化分析", "B", "差異化策略", aiData.seo.uspAnalysis.differentiationStrategy || ""]
            : ["USP差異化分析", "B", "差異化策略", aiData.seo.uspAnalysis.differentiationStrategy || "", aiData.seo.uspAnalysis.differentiationStrategy_zh || ""],
          isChinese
            ? ["USP差異化分析", "C", "品牌定位陳述", aiData.seo.uspAnalysis.positioningStatement || ""]
            : ["USP差異化分析", "C", "品牌定位陳述", aiData.seo.uspAnalysis.positioningStatement || "", aiData.seo.uspAnalysis.positioningStatement_zh || ""],
          ["", "", "", ""]
        );
      }

      // 內容優化建議
      if (aiData.seo.contentOptimization) {
        csvData.push(
          ["內容優化建議", "", "", ""],
          isChinese
            ? ["內容優化建議", "A", `標題長度 (目前: ${aiData.seo.contentOptimization.titleLength?.current || 0})`, aiData.seo.contentOptimization.titleLength?.recommended || ""]
            : ["內容優化建議", "A", `標題長度 (目前: ${aiData.seo.contentOptimization.titleLength?.current || 0})`, aiData.seo.contentOptimization.titleLength?.recommended || "", aiData.seo.contentOptimization.titleLength?.recommendation_zh || ""],
          isChinese
            ? ["內容優化建議", "B", `描述長度 (目前: ${aiData.seo.contentOptimization.descriptionLength?.current || 0})`, aiData.seo.contentOptimization.descriptionLength?.recommended || ""]
            : ["內容優化建議", "B", `描述長度 (目前: ${aiData.seo.contentOptimization.descriptionLength?.current || 0})`, aiData.seo.contentOptimization.descriptionLength?.recommended || "", aiData.seo.contentOptimization.descriptionLength?.recommendation_zh || ""],
          isChinese
            ? ["內容優化建議", "C", `可讀性評分 (${aiData.seo.contentOptimization.readabilityScore?.score || 0})`, aiData.seo.contentOptimization.readabilityScore?.suggestions || ""]
            : ["內容優化建議", "C", `可讀性評分 (${aiData.seo.contentOptimization.readabilityScore?.score || 0})`, aiData.seo.contentOptimization.readabilityScore?.suggestions || "", aiData.seo.contentOptimization.readabilityScore?.suggestions_zh || ""],
          ["", "", "", ""]
        );
      }
    }

    // 添加結構化資料區塊
    if (aiData.structuredData) {
      csvData.push(
        ["=== 結構化資料 (Schema.org) ===", "", "", ""],
        ["", "", "", ""],
        ["組織資訊 (Organization)", "", "", ""],
        ["組織資訊", "A", "類型", aiData.structuredData.organization?.type || ""],
        ["組織資訊", "B", "名稱", aiData.structuredData.organization?.name || ""],
        ["組織資訊", "C", "描述", aiData.structuredData.organization?.description || ""],
        ["組織資訊", "D", "網址", aiData.structuredData.organization?.url || ""],
        ["組織資訊", "E", "聯絡電話", aiData.structuredData.organization?.contactPoint?.telephone || ""],
        ["組織資訊", "F", "聯絡類型", aiData.structuredData.organization?.contactPoint?.contactType || ""],
        ["", "", "", ""],
        ["網站資訊 (WebSite)", "", "", ""],
        ["網站資訊", "A", "類型", aiData.structuredData.website?.type || ""],
        ["網站資訊", "B", "網址", aiData.structuredData.website?.url || ""],
        ["網站資訊", "C", "名稱", aiData.structuredData.website?.name || ""],
        ["網站資訊", "D", "描述", aiData.structuredData.website?.description || ""],
        ["", "", "", ""]
      );

      // 產品結構化資料
      if (aiData.structuredData.products && aiData.structuredData.products.length > 0) {
        csvData.push(["產品結構化資料", "", "", ""]);
        aiData.structuredData.products.forEach((product, index) => {
          csvData.push(
            [`產品 ${index + 1}`, "A", "類型", product.type || ""],
            [`產品 ${index + 1}`, "B", "名稱", product.name || ""],
            [`產品 ${index + 1}`, "C", "描述", product.description || ""],
            [`產品 ${index + 1}`, "D", "品牌", product.brand || ""],
            [`產品 ${index + 1}`, "E", "類別", product.category || ""],
            ["", "", "", ""]
          );
        });
      }
    }

    return csvData;
  };

  const getStatusColor = () => {
    switch (statusType) {
      case "error":
        return "text-red-600";
      case "success":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            TourPage AI 文案生成器
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            根據您的「素材需求表」與「行銷參數」自動生成網頁文案
          </p>
        </header>

        {/* API Key 設定區塊 */}
        {showApiKeyInput || !apiKey ? (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                設定 Google Gemini API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  請前往{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Google AI Studio
                  </a>{" "}
                  取得您的免費 API Key，然後貼上到下方欄位中。
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="貼上您的 Gemini API Key..."
                    className="flex-1"
                    id="apiKeyInput"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        const input = e.currentTarget;
                        if (input.value.trim()) {
                          handleSaveApiKey(input.value.trim());
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById(
                        "apiKeyInput"
                      ) as HTMLInputElement;
                      if (input && input.value.trim()) {
                        handleSaveApiKey(input.value.trim());
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    儲存 API Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  您的 API Key 會安全地儲存在瀏覽器的本地儲存空間中，不會傳送到我們的伺服器。
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                API Key 已設定（{apiKey.substring(0, 8)}...）
              </span>
            </div>
            <Button
              variant="outline"
              onClick={handleClearApiKey}
              className="text-sm"
            >
              變更 API Key
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {/* 階段 1: 輸入 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">
                階段 1：輸入 (Input)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 輸入模式切換 */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setInputMode("text")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    inputMode === "text"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  🚀 智能輸入（推薦）
                </button>
                <button
                  onClick={() => setInputMode("csv")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    inputMode === "csv"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  📄 CSV 上傳
                </button>
              </div>

              {inputMode === "text" ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="websiteUrl">
                      網站連結（選填）
                    </Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      placeholder="https://www.example.com"
                      value={websiteUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setWebsiteUrl(e.target.value)
                      }
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      提供您的官網連結（網站爬取功能開發中，目前請提供文字描述）
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="textInput">
                      公司/產品描述 <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="textInput"
                      value={textInput}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setTextInput(e.target.value)
                      }
                      className="mt-2 w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="請貼上您的公司簡介、產品描述或任何相關資訊...&#10;&#10;例如：&#10;振蕭機械工業有限公司專業生產砂光機已有40年的歷史，我們創造了自己的品牌「勝興牌」砂光機行銷於世界各地...&#10;&#10;關於振蕭：&#10;「勝興牌」砂光機的榮耀來自於世界各地客戶的支持與肯定...&#10;&#10;產品特色：&#10;1. 設計部門：完整的研發團隊...&#10;2. 生產部門：確實、嚴謹、專業的組裝程序...&#10;3. 品保部門：使用先進的測試儀器設備..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 <strong>提示：</strong>直接貼上您的公司簡介、產品介紹或任何描述文字，
                      AI 會自動分析並生成專業的網站文案。您可以包含：公司歷史、產品特色、服務內容、獲獎記錄、認證資訊等。
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="csvFileInput">
                    上傳「TourPage 素材需求表」 (CSV 格式)
                  </Label>
                  <Input
                    id="csvFileInput"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    請上傳您從 Excel 另存為的 .csv 檔案。
                    <a
                      href="/template.csv"
                      download
                      className="text-blue-600 hover:underline ml-2"
                    >
                      下載 CSV 範本
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 階段 2: 參數設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">
                階段 2：參數設定 (Parameters)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetAudience">目標人群 (Audience)</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger id="targetAudience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2C">
                        To C (B2C) - 強調情感、體驗
                      </SelectItem>
                      <SelectItem value="B2B">
                        To B (B2B) - 強調效益、解決方案
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="targetLanguage">目標市場 (語言)</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger id="targetLanguage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-TW">繁體中文 (台灣)</SelectItem>
                      <SelectItem value="zh-CN">简体中文 (中國)</SelectItem>
                      <SelectItem value="en-US">English (美國)</SelectItem>
                      <SelectItem value="en">English (通用)</SelectItem>
                      <SelectItem value="ja">日本語 (日本)</SelectItem>
                      <SelectItem value="ko">한국어 (韓國)</SelectItem>
                      <SelectItem value="de">Deutsch (德國)</SelectItem>
                      <SelectItem value="fr">Français (法國)</SelectItem>
                      <SelectItem value="it">Italiano (義大利)</SelectItem>
                      <SelectItem value="th">ภาษาไทย (泰國)</SelectItem>
                      <SelectItem value="vi">Tiếng Việt (越南)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="marketingFocus">行銷重點 (Focus)</Label>
                  <Select value={marketingFocus} onValueChange={setMarketingFocus}>
                    <SelectTrigger id="marketingFocus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">品牌介紹 (Brand)</SelectItem>
                      <SelectItem value="product">商品介紹 (Product)</SelectItem>
                      <SelectItem value="usp">強化 USP (USP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="requiredKeywords">
                    必提內容 (Slogan/關鍵字)
                  </Label>
                  <Input
                    id="requiredKeywords"
                    type="text"
                    placeholder="例如：2024 最佳新品、免安裝"
                    value={requiredKeywords}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequiredKeywords(e.target.value)}
                  />
                </div>
              </div>

              {/* SEO 進階設定區塊 */}
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-green-700">🎯 SEO 進階優化設定</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">NEW</span>
                  </div>
                  <button
                    onClick={() => setShowAdvancedSeo(!showAdvancedSeo)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showAdvancedSeo ? "隱藏進階設定" : "顯示進階設定"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="seoMode">SEO 優化強度</Label>
                    <Select value={seoMode} onValueChange={setSeoMode}>
                      <SelectTrigger id="seoMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">基礎 SEO - 標準優化</SelectItem>
                        <SelectItem value="advanced">進階 SEO - 完整分析</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contentLength">內容長度偏好</Label>
                    <Select value={contentLength} onValueChange={setContentLength}>
                      <SelectTrigger id="contentLength">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">精簡 - 簡潔有力</SelectItem>
                        <SelectItem value="medium">適中 - 平衡完整</SelectItem>
                        <SelectItem value="long">詳細 - 深度內容</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showAdvancedSeo && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="industryCategory">行業類別</Label>
                        <Input
                          id="industryCategory"
                          type="text"
                          placeholder="例如：機械製造、軟體服務、餐飲業"
                          value={industryCategory}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndustryCategory(e.target.value)}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          幫助 AI 進行行業關鍵字分析
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="targetLocation">目標地區</Label>
                        <Input
                          id="targetLocation"
                          type="text"
                          placeholder="例如：台灣、東南亞、全球"
                          value={targetLocation}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetLocation(e.target.value)}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          針對特定地區優化關鍵字
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="businessType">企業類型</Label>
                        <Input
                          id="businessType"
                          type="text"
                          placeholder="例如：製造商、代理商、服務提供商"
                          value={businessType}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessType(e.target.value)}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="competitorUrls">競爭對手網站 (選填)</Label>
                        <textarea
                          id="competitorUrls"
                          value={competitorUrls}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCompetitorUrls(e.target.value)}
                          className="mt-2 w-full h-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                          placeholder="請輸入競爭對手網址，一行一個：&#10;https://competitor1.com&#10;https://competitor2.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          AI 將分析競爭對手策略（功能開發中）
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">💡 專業提示：</span>
                        填寫越詳細的資訊，AI 就能提供更精準的 SEO 策略建議，包括競爭分析、關鍵字研究、內容優化建議等。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 階段 3 & 4: 生成與輸出 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">
                階段 3 & 4：生成 (Generation) 與 輸出 (Output)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={handleGeneration}
                disabled={isLoading}
                className="w-full md:w-1/2 text-lg"
              >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isLoading ? "處理中..." : "點擊生成文案"}
              </Button>

              {statusMessage && (
                <div className={`mt-4 text-sm ${getStatusColor()} min-h-[20px]`}>
                  {statusMessage}
                </div>
              )}

              {generatedCopyData && (
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  className="w-full md:w-1/2 text-lg mt-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  下載 Excel (CSV) 輸出檔
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
