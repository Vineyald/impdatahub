import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ClientProfileTable from '../components/ClientProfileTable';
import ClientProfileCharts from '../components/ClientProfileCharts';
import '../statics/css/ClientsProfile.scss';
import { Input, Button, Spacer, Card, Text } from "@nextui-org/react";

const ClientProfile = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const response = await axios.get(`/api/clientes/${clientId}/`);
        setClient(response.data.client);
        setPurchases(response.data.purchases);
      } catch (error) {
        console.error('Erro ao carregar dados do cliente', error);
      }
    };
    fetchClientData();
  }, [clientId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClient((prevClient) => ({ ...prevClient, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/clientes/${clientId}/`, client);
      alert('Dados atualizados com sucesso!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar dados', error);
    }
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month.slice(0, 7));
  };

  const handleResetFilter = () => {
    setSelectedMonth(null);
  };

  const filteredPurchases = selectedMonth
    ? purchases.filter(purchase => purchase.data_compra.startsWith(selectedMonth))
    : purchases;

  if (!client) return <div>Carregando...</div>;

  return (
    <div className="client-profile">
      <div className="text-center p-5">
        <Text h1>Perfil de {client.nome}</Text>
      </div>
      <div className="container">
        <div className="client-details fs-5 text-left">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <Input
                required
                label="CEP"
                name="cep"
                value={client.cep || ''}
                onChange={handleInputChange}
                fullWidth
              />
              <Spacer y={1} />
              <Input
                label="CPF/CNPJ"
                name="cpf_cnpj"
                value={client.cpf_cnpj || ''}
                onChange={handleInputChange}
                fullWidth
              />
              <Spacer y={1} />
              <Input
                label="Celular"
                name="celular"
                value={client.celular || ''}
                onChange={handleInputChange}
                fullWidth
              />
              <Spacer y={1} />
              <Input
                label="Endereço"
                name="endereco"
                value={client.endereco || ''}
                onChange={handleInputChange}
                fullWidth
              />
              <Spacer y={1} />
              <Input
                label="Tipo de Pessoa"
                name="tipo_pessoa"
                value={client.tipo_pessoa || ''}
                onChange={handleInputChange}
                fullWidth
              />
              <Spacer y={1} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" color="success" auto>
                  Atualizar
                </Button>
                <Button color="error" auto onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Card>
              <Text>CEP: {client.cep}</Text>
              <Text>CPF/CNPJ: {client.cpf_cnpj}</Text>
              <Text>Celular: {client.celular}</Text>
              <Text>Endereço: {client.endereco}</Text>
              <Text>Tipo de Pessoa: {client.tipo_pessoa}</Text>
              <Button color="primary" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            </Card>
          )}
        </div>
        <div className="chart-section">
          <Text h2>Gastos por mês</Text>
          <ClientProfileCharts purchases={purchases} onMonthSelect={handleMonthSelect} />
          {selectedMonth && (
            <Button className="reset-button" onClick={handleResetFilter} color="primary" auto>
              Ver todas as compras
            </Button>
          )}
        </div>
      </div>
      <div className="purchases-table">
        <Text h2>Compras do Cliente</Text>
        <ClientProfileTable purchases={filteredPurchases} />
      </div>
    </div>
  );
};

export default ClientProfile;
