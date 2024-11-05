"use client";

import React, { useState, Key, Suspense } from "react";
import { Tabs, Tab, Input, Link, Button, Card, CardBody } from "@nextui-org/react";
import { login, register } from "@/services/auth";
import { useRouter } from "next/navigation";

function AuthForm() {
  const [selected, setSelected] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSelectionChange = (key: Key) => {
    setSelected(key as string);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido no login.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password, adminPassword);
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao registrar.");
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center min-h-screen">
      <Card className="max-w-full sd:w-[340px] md:w-[800px]">
        <CardBody className="overflow-hidden p-5">
          <Tabs
            fullWidth
            size="md"
            aria-label="Tabs form"
            selectedKey={selected}
            onSelectionChange={handleSelectionChange}
            motionProps={{
              variants: {
                enter: {
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.3, ease: "easeOut" },
                },
                exit: {
                  y: -10,
                  opacity: 0,
                  transition: { duration: 0.2, ease: "easeIn" },
                },
              },
            }}
          >
            <Tab key="login" title="Login">
              <form className="flex flex-col gap-4 mb-4" onSubmit={handleLogin}>
                <Input isRequired label="Email" placeholder="Digite seu e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input isRequired label="Senha" placeholder="Digite sua senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <p className="text-red-500 text-center">{error}</p>}
                <p className="text-center text-small">
                  Precisa criar uma conta?{" "}
                  <Link size="sm" onPress={() => setSelected("sign-up")}>Cadastre-se</Link>
                </p>
                <div className="flex gap-2 justify-end">
                  <Button fullWidth color="primary" type="submit">Entrar</Button>
                </div>
              </form>
            </Tab>
            <Tab key="sign-up" title="Cadastre-se">
              <form className="flex flex-col gap-4 mb-4" onSubmit={handleRegister}>
                <Input isRequired label="Nome" placeholder="Digite seu nome" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                <Input isRequired label="Email" placeholder="Digite seu e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input isRequired label="Senha" placeholder="Digite sua senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Input isRequired label="Senha de Administrador" placeholder="Digite a senha de ADM" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                {error && <p className="text-red-500 text-center">{error}</p>}
                <p className="text-center text-small">
                  Já tem uma conta?{" "}
                  <Link size="sm" onPress={() => setSelected("login")}>Faça login</Link>
                </p>
                <div className="flex gap-2 justify-end">
                  <Button fullWidth color="primary" type="submit">Criar conta</Button>
                </div>
              </form>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AuthForm />
    </Suspense>
  );
}
