import { Download, Smartphone, Wifi, Zap, Shield } from "lucide-react";

const APK_URL = "https://archive.org/download/Zenkatuapp/Zenkatuapp.apk";

export default function VersaoApp() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Zenkatu App</h1>
            <p className="text-muted-foreground mt-2">
              Leve o Zenkatu no seu bolso. Assista onde e quando quiser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex flex-col items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Rápido</span>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex flex-col items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Offline</span>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex flex-col items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Seguro</span>
          </div>
        </div>

        <a
          href={APK_URL}
          download
          className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Download className="w-5 h-5" />
          Baixar APK
        </a>

        <p className="text-xs text-muted-foreground/60">
          Apenas para Android. Ative "Fontes desconhecidas" nas configurações do
          seu dispositivo antes de instalar.
        </p>
      </div>
    </div>
  );
}
