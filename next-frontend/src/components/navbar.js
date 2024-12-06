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
  DropdownMenu,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarMenuItem
} from "@nextui-org/react";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function App() {
  const [userName, setUserName] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = Cookies.get("accessToken");
  
      if (!token) {
        console.warn("No access token found.");
        return;
      }
  
      const cachedData = localStorage.getItem("userData");
      const cachedTimestamp = localStorage.getItem("userDataTimestamp");
  
      // Check if cached data exists and is not expired
      if (cachedData && cachedTimestamp) {
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
  
        if (now - parseInt(cachedTimestamp, 10) < oneHour) {
          setUserName(JSON.parse(cachedData).name);
          return; // Use cached data
        }
      }
  
      // Fetch new data from the API
      try {
        const response = await fetch(`${API_URL}/user/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
  
        const data = await response.json();
  
        // Store fetched data in localStorage
        localStorage.setItem("userData", JSON.stringify(data));
        localStorage.setItem("userDataTimestamp", new Date().getTime().toString());
  
        setUserName(data.name);
      } catch (error) {
        console.error("Erro ao obter dados do usuário:", error);
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
    <Navbar isBordered onMenuOpenChange={setIsMenuOpen}>
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="font-bold text-inherit">Imperio datahub</Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button variant="Light" radius="none">
                Dashboard Clientes
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dropdown menu">
              <DropdownItem key="custumer_inactive" href="/customers/customer-inactive/">Clientes Inativos</DropdownItem>
              <DropdownItem key="custumer_ranking" href="/customers/customer-ranking/">Ranking de Clientes</DropdownItem>
              <DropdownItem key="custumer_filters" href="/customers/customer-list/">Lista de Clientes</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
        <NavbarItem>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button variant="Light" radius="none">
                Dashboard Produtos
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dropdown menu" disabledKeys={["product_stuck","product_dash"]}>
              <DropdownItem key="product_best" href="/products/product-best/">Produtos mais Vendidos</DropdownItem>
              <DropdownItem key="product_stuck">Produtos sem Vendas</DropdownItem>
              <DropdownItem key="product_dash">Relatórios de Produtos</DropdownItem>
              <DropdownItem key="product_list" href="/products/product-list/">Lista de Produtos</DropdownItem>
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
            <DropdownMenu variant="faded" aria-label="Dropdown menu" disabledKeys={["sells_ranking","sells_routes","sells_weekly","sells_resume"]}>
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
              <Dropdown backdrop="blur">
                <DropdownTrigger>
                  <Button variant="Flat" radius="none" size="lg" color="secondary">
                    Bem vindo, {userName}
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

      <NavbarMenu isOpen={isMenuOpen}>
        <NavbarMenuItem>
          <Link color="foreground" href="/customers/customer-inactive/">
            Clientes Inativos
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="/customers/customer-ranking/">
            Ranking de Clientes
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Filtrar Clientes
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Clientes sem Compras
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Produtos mais Vendidos
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Produtos sem Vendas
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Relatórios de Produtos
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Ranking de Compras
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Produtos sem Vendas
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Vendas Semanais
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link color="foreground" href="#">
            Relatórios de Produtos
          </Link>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}
