"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Input,
  Button,
  Spacer,
  Card,
  CardBody,
  Select,
  SelectItem,
  Divider,
} from "@nextui-org/react";
import dynamic from "next/dynamic";

const ClientProfileCharts = dynamic(() => import("../customerprofilecharts"), {
  ssr: false,
});

const ClientProfileTable = dynamic(() => import("../customerprofiletable"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface ClientInfo {
  id: number;
  nome: string;
  fantasia: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string;
  celular: string;
  fone: string;
  cep: string;
  rota: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  situacao: string;
  vendedor: string;
  contribuinte: string;
  codigo_regime_tributario: string;
  limite_credito: number;
  ultima_compra: string | null;
}

interface PurchasesData {
  id: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  frete: number;
  preco_final: number;
  situacao: string;
}

export default function ClientProfilePage() {
  const params = useParams() as Record<string, string | string[]> | null;
  const customerId = params?.customerId as string | undefined;

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [purchases, setPurchases] = useState<PurchasesData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (customerId) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await axios.get(`${API_URL}/clientes/${customerId}/`);
          setClient(response.data.client);
          setPurchases(response.data.purchases);
        } catch (error) {
          setError("Erro ao carregar dados do cliente");
          console.error("Erro ao carregar dados do cliente:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (customerId) {
      fetchClientData();
    }
  }, [customerId]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!client) {
    return <div>Dados do cliente não encontrados.</div>;
  }

  console.log(client);

  const handleInputChange = (e: React.ChangeEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    setClient((prevClient) =>
      prevClient ? { ...prevClient, [name]: value } : null
    );
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (customerId && client) {
        await axios.put(`${API_URL}/clientes/${customerId}/`, client);
        alert("Dados atualizados com sucesso!");
        setIsEditing(false);
      }
    } catch (error) {
      setError("Erro ao atualizar dados");
      console.error("Erro ao atualizar dados", error);
    }
  };

  // Helper function to categorize client data
  const categorizeClientData = (client: ClientInfo | null) => {
    if (!client) return {};

    return {
      informacoes: {
        Nome: client.nome,
        Fantasia: client.fantasia,
        "Tipo de Pessoa": client.tipo_pessoa,
        "CPF/CNPJ": client.cpf_cnpj,
        Email: client.email,
        Celular: client.celular,
        Telefone: client.fone,
      },
      endereco: {
        CEP: client.cep,
        Endereço: client.endereco,
        Número: client.numero,
        Complemento: client.complemento,
        Bairro: client.bairro,
        Cidade: client.cidade,
        Estado: client.estado,
      },
      situacao: {
        Situação: client.situacao,
        Vendedor: client.vendedor,
        Contribuinte: client.contribuinte,
        "Código Regime Tributário": client.codigo_regime_tributario,
        "Limite de Crédito": client.limite_credito,
        "Última Compra": client.ultima_compra,
      },
    };
  };

  // Inside the component
  const categorizedData = categorizeClientData(client);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month.slice(0, 7));
  };

  const handleResetFilter = () => {
    setSelectedMonth(null);
  };  

  const filteredPurchases = purchases
    .filter((purchase) =>
      purchase.produto.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((purchase) =>
      selectedMonth ? purchase.data_compra.startsWith(selectedMonth) : true
    );

  return (
    <div className="clientProfile">
      <div className="text-center p-5">
        <Spacer y={10} />
        <div className="container mx-auto md:max-w-5xl">
          <div className="items-center text-center">
            <p className="text-5xl font-bold capitalize">
              Perfil de {client?.nome || "Cliente"}
            </p>
          </div>
        </div>
      </div>
      <div className="container md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        <Spacer y={5} />
        <Card className="p-6 shadow-lg md">
          {isEditing ? (
            <CardBody className="">
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <Input
                  required
                  label="Nome"
                  placeholder="Digite o nome do cliente"
                  name="nome"
                  value={client?.nome || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  className="col-span-2"
                />
                <Input
                  label="Fantasia"
                  name="fantasia"
                  placeholder="Digite o nome fantasia do cliente"
                  value={client?.fantasia || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Fantasia"
                  className="col-span-2"
                />
                <Select
                  label="Tipo de Pessoa"
                  name="tipo_pessoa"
                  placeholder="Selecione o tipo do cliente (CPF ou CPNJ)"
                  value={client?.tipo_pessoa || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(e)}
                  fullWidth
                  className="col-span-1"
                >
                  <SelectItem value="F" key="F">Física</SelectItem>
                  <SelectItem value="J" key="J">Jurídica</SelectItem>
                </Select>
                <Input
                  label="CPF/CNPJ"
                  name="cpf_cnpj"
                  placeholder="Digite identificador do cliente (CPF ou CPNJ)"
                  value={client?.cpf_cnpj || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="CPF/CNPJ"
                  className="col-span-1"
                />
                <Input
                  label="E-mail"
                  name="email"
                  placeholder="Digite o e-mail do cliente"
                  value={client?.email || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="E-mail"
                  className="col-span-2"
                />
                <Input
                  label="Celular"
                  name="celular"
                  placeholder="Digite o celular do cliente"
                  value={client?.celular || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Celular"
                  className="col-span-1"
                />
                <Input
                  label="Telefone"
                  name="fone"
                  placeholder="Digite o telefone do cliente"
                  value={client?.fone || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Telefone"
                  className="col-span-1"
                />
                <Input
                  label="CEP"
                  name="cep"
                  placeholder="Digite o CEP do cliente"
                  value={client?.cep || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="CEP"
                  className="col-span-1"
                />
                <Input
                  label="Endereço"
                  name="endereco"
                  placeholder="Digite o endereço do cliente"
                  value={client?.endereco || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Endereço"
                  className="col-span-1"
                />
                <Input
                  label="Número"
                  name="numero"
                  placeholder="Digite o número do logradouro do cliente"
                  value={client?.numero || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Número"
                  className="col-span-1"
                />
                <Input
                  label="Complemento"
                  name="complemento"
                  placeholder="Digite o complemento do logradouro do cliente"
                  value={client?.complemento || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Complemento"
                  className="col-span-1"
                />
                <Input
                  label="Bairro"
                  name="bairro"
                  placeholder="Digite o bairro do logradouro do cliente"
                  value={client?.bairro || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Bairro"
                  className="col-span-1"
                />
                <Input
                  label="Cidade"
                  name="cidade"
                  placeholder="Digite a cidade do cliente"
                  value={client?.cidade || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Cidade"
                  className="col-span-1"
                />
                <Input
                  label="Estado"
                  name="estado"
                  placeholder="Digite a sigla do estado do cliente"
                  value={client?.estado || ''}
                  onChange={(e) => handleInputChange(e)}
                  fullWidth
                  aria-label="Estado"
                  className="col-span-1"
                />
                <Select
                  label="Situação"
                  name="situacao"
                  placeholder="Selecione a situação do cliente"
                  value={client?.situacao || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(e)}
                  fullWidth
                  aria-label="Situação"
                  className="col-span-1"
                >
                  <SelectItem value="ativo" key="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo" key="inativo">Inativo</SelectItem>
                </Select>
                <Button className="col-span-2" type="submit" color="primary" fullWidth>
                  Salvar
                </Button>
              </form>
            </CardBody>
          ) : (
            <CardBody>
              <div className="text-left space-y-8">
                {Object.entries(categorizedData).map(([category, fields]) => (
                    <div key={category} className="mb-6">
                      <h2 className="text-xl font-bold capitalize">{category}</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {Object.entries(fields).map(([key, value]) => (
                          <h1 className="text-lg" key={key}>
                            <span className="font-semibold">{key}:</span> {typeof value === 'string' || typeof value === 'number' ? value : null}
                          </h1>
                        ))}
                      </div>
                      <Divider className="my-6" />
                    </div>
                  ))}
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                className="mt-4"
                color="primary"
              >
                Editar
              </Button>
            </CardBody>
          )}
        </Card>
        <div>
          <Spacer y={10} />
          <div className="container mx-auto">
            <div className="items-center text-center">
              <p className="text-3xl font-semibold">Gastos por mês</p>
            </div>
          </div>
          <Spacer y={5} />
          <ClientProfileCharts
            purchases={purchases}
            onMonthSelect={handleMonthSelect}
          />
          {selectedMonth && (
            <div className="container mx-auto items-center">
              <Spacer y={5} />
              <Button
                className="reset-button"
                onClick={handleResetFilter}
                color="primary"
              >
                Ver todas as compras
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="purchases-table">
        <Spacer y={10} />
        <div className="container mx-auto">
          <div className="items-center text-center">
            <p className="text-3xl font-semibold">Compras do cliente por item</p>
          </div>
        </div>
        <Spacer y={8} />
        <Card className="md:max-w-5xl 2xl:max-w-screen-2xl mx-auto mb-6">
          <CardBody className="flex flex-col items-center">
            <span>Pesquise um produto: </span>
            <Spacer y={2} />
            <Input
              placeholder="Produto"
              value={searchTerm}
              onChange={handleSearchChange}
              fullWidth
            />
          </CardBody>
        </Card>
        <Spacer y={5} />
        <ClientProfileTable purchases={filteredPurchases} />
      </div>
    </div>
  );
}
