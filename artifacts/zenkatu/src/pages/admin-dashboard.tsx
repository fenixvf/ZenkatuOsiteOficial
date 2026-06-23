import { useGetAdminStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Film, Users, MessageSquare, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    { title: "Total de Obras", value: stats?.totalObras, icon: Layers, color: "text-blue-500", link: "/admin/obras" },
    { title: "Total de Episódios", value: stats?.totalEpisodios, icon: Film, color: "text-purple-500", link: "/admin/obras" },
    { title: "Usuários", value: stats?.totalUsuarios, icon: Users, color: "text-green-500", link: "#" },
    { title: "Comentários Hoje", value: stats?.comentariosHoje, icon: MessageSquare, color: "text-orange-500", link: "#" },
  ];

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">Visão geral da plataforma Zenkatu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            {stat.link !== "#" ? (
              <Link href={stat.link}>
                <Card className="border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-3xl font-bold font-display">{stat.value?.toLocaleString() || 0}</div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card className="border-border bg-card/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-3xl font-bold font-display">{stat.value?.toLocaleString() || 0}</div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}
      </div>

      <h2 className="font-display text-2xl font-bold text-foreground mb-6">Ações Rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href="/admin/obras/nova">
          <Card className="border-border bg-gradient-to-br from-primary/10 to-transparent hover:from-primary/20 border-primary/30 hover:border-primary transition-all cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Nova Obra</h3>
                <p className="text-sm text-muted-foreground">Adicionar anime ao catálogo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/notificacoes">
          <Card className="border-border bg-gradient-to-br from-orange-500/10 to-transparent hover:from-orange-500/20 border-orange-500/30 hover:border-orange-500 transition-all cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Notificações Push</h3>
                <p className="text-sm text-muted-foreground">Enviar aviso personalizado</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
