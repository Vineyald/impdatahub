'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  DropdownItem,
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu
} from "@nextui-org/react";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function App() {
  const [userName, setUserName] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Simulação de uma requisição para buscar o nome do usuário
    const fetchUserData = async () => {
      const token = Cookies.get("accessToken");
      if (token) {
        try {
          // Exemplo de requisição para obter dados do usuário logado
          const response = await fetch(`${API_URL}/user/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          setUserName(data.name);
        } catch (error) {
          console.error("Erro ao obter dados do usuário:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setUserName(null);

    router.push("/login/")
  };

  return (
    <Navbar
      isBordered
      classNames={{
        item: [
          "flex",
          "relative",
          "h-full",
          "items-center",
          "data-[active=true]:after:content-['']",
          "data-[active=true]:after:absolute",
          "data-[active=true]:after:bottom-0",
          "data-[active=true]:after:left-0",
          "data-[active=true]:after:right-0",
          "data-[active=true]:after:h-[2px]",
          "data-[active=true]:after:rounded-[2px]",
          "data-[active=true]:after:bg-primary",
        ],
      }}
    >
      <NavbarBrand>
        <p className="font-bold text-inherit">Imperio datahub</p>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button variant="Light" radius="none">
                Dashboard Clientes
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dropdown menu">
              <DropdownItem key="custumer_inactive" href="/custumers/custumer-inactive/">Clientes Inativos</DropdownItem>
              <DropdownItem key="custumer_ranking">Ranking de Clientes</DropdownItem>
              <DropdownItem key="custumer_filters">Filtrar Clientes</DropdownItem>
              <DropdownItem key="custumer_metrics">Clientes sem Compras</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
        <NavbarItem isActive>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button variant="Light" radius="none">
                Dashboard Produtos
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dropdown menu">
              <DropdownItem key="product_ranking">Produtos mais Vendidos</DropdownItem>
              <DropdownItem key="product_stuck">Produtos sem Vendas</DropdownItem>
              <DropdownItem key="product_dash">Relatórios de Produtos</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
        <NavbarItem>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button variant="Light" radius="none">
                Dashboard Vendas
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dropdown menu">
              <DropdownItem key="sells_ranking">Ranking de Compras</DropdownItem>
              <DropdownItem key="sells_routes">Produtos sem Vendas</DropdownItem>
              <DropdownItem key="sells_weekly">Vendas Semanais</DropdownItem>
              <DropdownItem key="sells_resume">Relatórios de Produtos</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        {userName ? (
          <>
            <NavbarItem className="hidden lg:flex">
              <span>Bem-vindo, </span>
              <Dropdown backdrop="blur">
                <DropdownTrigger>
                  <Button variant="Flat" radius="none" size="lg" color="secondary">
                    {userName}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu variant="faded" aria-label="Dropdown menu">
                  <DropdownItem key="user_mysells">Minhas Vendas</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
            <NavbarItem>
              <Button color="danger" variant="flat" onClick={handleLogout}>
                Logout
              </Button>
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem className="hidden lg:flex">
              <Link href="#">Login</Link>
            </NavbarItem>
            <NavbarItem>
              <Button as={Link} color="primary" href="#" variant="flat">
                Sign Up
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>
    </Navbar>
  );
}
