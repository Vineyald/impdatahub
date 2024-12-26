'use client';

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Select, SelectItem } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { PlotMouseEvent } from "plotly.js";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import('@/components/charts/line-chart/line-chart-comp'), { ssr: false });

interface ProductInfo {
  sku: string;
  descricao: string;
  total_vendido: number;
  valor_total_vendido: number;
}

interface ProductsData {
  produtos: ProductInfo[];
}

interface GraphConfig {
  name: string;
  xaxis: string[];
  xaxistitle: string;
  yaxis: number[];
  yaxistitle: string;
  type: string;
  text?: string[];
}

export default function MostSoldProducts() {
  const [produtos, setProdutos] = useState<ProductInfo[] | null>(null);
  const [sortBy, setSortBy] = useState<"total_vendido" | "valor_total_vendido">("total_vendido");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<ProductsData>(`${process.env.NEXT_PUBLIC_API_URL}/products-list/`);
        setProdutos(response.data.produtos);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchData();
  }, []);

  if (!produtos) {
    return <div>Loading...</div>;
  }

  const topProducts = produtos
    .slice()
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);

  const quantitySoldConfig: GraphConfig = {
    name: "Quantidade Vendida",
    xaxis: topProducts.map((p) => p.descricao),
    xaxistitle: "Produtos",
    yaxis: topProducts.map((p) => p.total_vendido),
    yaxistitle: "Quantidade",
    type: "bar",
    text: topProducts.map((p) => p.total_vendido.toString()),
  };

  const totalValueConfig: GraphConfig = {
    name: "Valor Total Vendido",
    xaxis: topProducts.map((p) => p.descricao),
    xaxistitle: "Produtos",
    yaxis: topProducts.map((p) => p.valor_total_vendido),
    yaxistitle: "Valor Vendido (R$)",
    type: "scatter",
    text: topProducts.map((p) => p.total_vendido.toString()),
  };

  const skus = topProducts.map((p) => p.sku);

  const handleBarClick = (event: Readonly<PlotMouseEvent>) => {
    const x = event.points[0].x;
    const skuIndex = topProducts.findIndex((p) => p.descricao === x);
    const sku = skus[skuIndex];
    if (sku) {
      router.push(`/products/product-page/${sku}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Select
          label="Ordenar por"
          selectedKeys={new Set([sortBy])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as "total_vendido" | "valor_total_vendido";
            setSortBy(selected);
          }}
        >
          <SelectItem key="total_vendido" value="total_vendido">
            Quantidade Vendida
          </SelectItem>
          <SelectItem key="valor_total_vendido" value="valor_total_vendido">
            Valor Total Vendido
          </SelectItem>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2 2xl:col-span-1">
          <LineChart graphs={[{ ...quantitySoldConfig, type: "bar" }]} numberOfGraphs={1} onClick={handleBarClick} />
        </div>
        <div className="col-span-2 2xl:col-span-1">
          <LineChart graphs={[{...totalValueConfig, type: "scatter"}]} numberOfGraphs={1} onClick={handleBarClick} />
        </div>
      </div>
    </div>
  );
}
