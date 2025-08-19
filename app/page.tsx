"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

// Componentes customizados para o markdown
const markdownComponents = {
  p: (props: any) => <p {...props} />,
  strong: (props: any) => <strong {...props} />,
  em: (props: any) => <em {...props} />,
  ul: (props: any) => <ul {...props} />,
  li: (props: any) => <li {...props} />,
  h1: (props: any) => <h1 {...props} />,
  h2: (props: any) => <h2 {...props} />,
  h3: (props: any) => <h3 {...props} />,
  h4: (props: any) => <h4 {...props} />,
  h5: (props: any) => <h5 {...props} />,
  h6: (props: any) => <h6 {...props} />,
  br: () => <br />,
};

export default function VEO3PromptGenerator() {
  const [prompt, setPrompt] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [continueSession, setContinueSession] = useState(false);
  const [responseId, setResponseId] = useState("");

  // Limpa responseId se desmarcar o checkbox
  const handleContinueSessionChange = (checked: boolean) => {
    setContinueSession(checked);
    if (!checked) {
      setResponseId("");
    }
  };
  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const body = continueSession && responseId
        ? { prompt, responseId }
        : { prompt };
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) {
        setGeneratedPrompt("Erro ao gerar prompt: " + data.error);
      } else {
        let allTexts: string[] = [];
        let respId = "";
        if (Array.isArray(data)) {
          allTexts = data
            .map((item) => item?.candidates?.[0]?.content?.parts?.[0]?.text)
            .filter(Boolean);
          respId = data[0]?.responseId || "";
        } else if (typeof data === "object" && data !== null) {
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) allTexts.push(text);
          respId = data?.responseId || "";
        } else if (typeof data === "string") {
          allTexts.push(data);
        }
        setGeneratedPrompt(allTexts.length ? allTexts.join("\n\n") : "Resposta não encontrada");
        // Salva o responseId se existir, para usar no próximo request caso o checkbox esteja marcado
        if (respId) setResponseId(respId);
      }
    } catch {
      setGeneratedPrompt("Erro ao conectar à API");
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">VEO3 Prompt Generator</h1>
              <p className="text-sm text-muted-foreground">Crie prompts otimizados para geração de vídeos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* ...removido upload de imagem... */}

          {/* Prompt Input Section */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Descrição do Vídeo
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <Textarea
                placeholder="Descreva o vídeo que você quer gerar... Ex: Uma pessoa caminhando na praia ao pôr do sol, com ondas suaves e luz dourada"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex flex-col items-start">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={continueSession}
                    onChange={e => handleContinueSessionChange(e.target.checked)}
                    className="accent-primary"
                  />
                  Continuar conversa
                </label>
                {continueSession && responseId && (
                  <span className="text-xs text-muted-foreground mt-1">Último responseId: <span className="font-mono">{responseId}</span></span>
                )}
              </div>
            </div>
            <Button onClick={generatePrompt} disabled={isGenerating || !prompt} className="w-full">
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Gerando Prompt...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Gerar Prompt para VEO3
                </>
              )}
            </Button>
          </Card>

          {/* Generated Prompt Section */}
          {generatedPrompt && (
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Prompt Otimizado para VEO3
              </h2>
              <div className="bg-muted rounded-lg p-4 mb-4 text-foreground leading-relaxed markdown-body">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">markdown</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <ReactMarkdown components={markdownComponents}>
                  {generatedPrompt}
                </ReactMarkdown>
              </div>
            </Card>
          )}
          {/* Tips Section */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="font-medium text-foreground mb-3">💡 Dicas para melhores resultados:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Seja específico sobre movimentos, iluminação e ambiente</li>
              <li>• Mencione o estilo visual desejado (cinematográfico, documental, etc.)</li>
              <li>• Inclua detalhes sobre a duração e ritmo do vídeo</li>
              <li>• Use referências de imagem para maior precisão</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}
