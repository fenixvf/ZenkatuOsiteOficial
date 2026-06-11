import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <div className="relative">
            <span className="font-display text-[120px] md:text-[160px] font-black text-foreground/5 select-none leading-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-full bg-primary/15 text-primary">
                <AlertTriangle className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          A página que você está procurando não existe ou foi movida.
        </p>

        <Button asChild size="lg" className="font-display tracking-wide px-8">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            Voltar ao início
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
