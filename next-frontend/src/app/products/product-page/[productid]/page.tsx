'use client';

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Input,
  Button,
  Spacer,
  Card,
  CardBody,
  Divider,
} from "@nextui-org/react";
import dynamic from "next/dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

const ProductSalesTable = dynamic(() => import("../productpagetable"), {
  ssr: false,
});
const ProductSalesChart = dynamic(() => import("../productpagecharts"), {
  ssr: false,
});

interface Venda {
  id: number;
  data_compra: string;
  quantidade: number;
  id_cliente: number;
  nome_cliente: string;
  valor_total: number;
}

interface Produto {
  produto: Produto;
  sku: string;
  descricao: string;
  preco: string;
  preco_promocional: string | null;
  estoque_disponivel: string;
  unidade: string;
  custo: string;
  vendas: Venda[] | null;
}

export default function ProductProfilePage() {
  const params = useParams() as Record<string, string | string[]> | null;
  const productId = params?.productid as string | undefined;

  const [productData, setProductData] = useState<Produto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductData = async () => {
      if (productId) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await axios.get(`${API_URL}/products/${productId}`);
          const productData: Produto = response.data;
          
          console.log("Product data:", productData);
          // Save to localStorage
          localStorage.setItem("productData", JSON.stringify(productData));
          setProductData(productData);
        } catch (error) {
          setError("Erro ao carregar dados do produto");
          console.error("Erro ao carregar dados do produto:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchProductData();
  }, [productId]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (productData) {
      setProductData({
        ...productData,
        produto: {
          ...productData.produto,
          [name]: value,
        },
      });
    }
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (productData) {
      try {
        const response = await axios.put(`${API_URL}/products/${productData.produto.sku}`, productData);
        console.log("Product updated:", response.data);
        localStorage.setItem("productData", JSON.stringify(response.data));
        setIsEditing(false);
      } catch (error) {
        console.error("Error updating product:", error);
      }
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!productData) {
    return <div>Produto não encontrado.</div>;
  }

  const categorizedData = {
    "Informações Básicas": {
      SKU: productData?.produto?.sku || "N/A",
      Descrição: productData?.produto?.descricao || "N/A",
      Preço: productData?.produto?.preco || "N/A",
      "Preço Promocional": productData?.produto?.preco_promocional || "N/A",
    },
    Estoque: {
      "Estoque Disponível": productData?.produto?.estoque_disponivel || "N/A",
      Unidade: productData?.produto?.unidade || "N/A",
      Custo: productData?.produto?.custo || "N/A",
    },
  };

  return (
    <div className="productProfile">
      <div className="text-center p-5">
        <Spacer y={10} />
        <div className="container mx-auto md:max-w-5xl">
          <div className="items-center text-center">
            <p className="text-5xl font-bold capitalize">
              {productData?.produto.descricao || "Produto"}
            </p>
          </div>
        </div>
      </div>
      <div className="container md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        <Spacer y={5} />
        <Card className="p-6 shadow-lg md">
          {isEditing ? (
            <CardBody>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <Input
                  required
                  label="SKU"
                  placeholder="Digite o SKU"
                  name="sku"
                  value={productData.produto.sku}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-2"
                />
                <Input
                  required
                  label="Descrição"
                  placeholder="Digite a descrição"
                  name="descricao"
                  value={productData.produto.descricao}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-2"
                />
                <Input
                  label="Preço"
                  name="preco"
                  placeholder="Digite o preço"
                  value={productData.produto.preco}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-1"
                />
                <Input
                  label="Preço Promocional"
                  name="preco_promocional"
                  placeholder="Digite o preço promocional"
                  value={productData.produto.preco_promocional || ""}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-1"
                />
                <Input
                  label="Estoque"
                  name="estoque_disponivel"
                  placeholder="Digite o estoque disponível"
                  value={productData.produto.estoque_disponivel}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-1"
                />
                <Input
                  label="Unidade"
                  name="unidade"
                  placeholder="Digite a unidade"
                  value={productData.produto.unidade}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-1"
                />
                <Input
                  label="Custo"
                  name="custo"
                  placeholder="Digite o custo"
                  value={productData.produto.custo}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-2"
                />
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
                          <span className="font-semibold">{key}:</span>{" "}
                          {typeof value === "string" || typeof value === "number"
                            ? value
                            : "N/A"}
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
      </div>
      <div>
        <Spacer y={5} />
        <div className="purchases-table">
          <Spacer y={10} />
          <div className="container mx-auto">
            <div className="items-center text-center">
              <p className="text-3xl font-semibold">Vendas deste produto por mês</p>
            </div>
          </div>
          <Spacer y={5} />
          <ProductSalesChart/>
        </div>
      </div>
      <div>
        <Spacer y={5} />
        <div className="purchases-table">
          <Spacer y={10} />
          <div className="container mx-auto">
            <div className="items-center text-center">
              <p className="text-3xl font-semibold">Tabela de vendas deste produto</p>
            </div>
          </div>
          <Spacer y={5} />
          <ProductSalesTable/>
        </div>
      </div>
    </div>
  );
}
