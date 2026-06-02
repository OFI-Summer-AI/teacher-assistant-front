import type React from "react"
import { useState } from "react"
import { useAuth } from "@/shared/hooks/use-auth"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/Input"
import { Label } from "@/shared/components/ui/label"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(username, password)
    if (!result.success) {
      setError(result.error ?? "No se pudo iniciar sesión.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-background">
        {/* Decorative blurs */}
        <div className="absolute top-20 right-20 h-32 w-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 h-40 w-40 bg-accent/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10 bg-card rounded-2xl shadow-sm p-8 border border-border">
          {/* Logo */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-balance">
              <span className="text-primary">Academy</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base text-foreground">
                Username
              </Label>
              <Input
                id="username"
                placeholder="director1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base text-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-colors"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            Seeds: director1 / Pass1234! · teacher1 / Pass1234! · teacher2 / Pass1234!
          </p>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground p-12 items-center justify-center relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-bold mb-6 text-balance leading-tight">
            Transforma tu carrera mediante el aprendizaje continuo
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
            Accede a cursos especializados, sigue tu progreso y alcanza tus metas profesionales.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold text-primary-foreground">50+</p>
              <p className="text-sm text-primary-foreground/80">Cursos</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold text-primary-foreground">2</p>
              <p className="text-sm text-primary-foreground/80">Roles</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold text-primary-foreground">100%</p>
              <p className="text-sm text-primary-foreground/80">Plataforma activa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}