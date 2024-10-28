import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ClientProfileTable from '../components/ClientProfileTable';
import '../statics/css/ClientsProfile.scss';

const ClientProfile = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode

  // Fetch client data and purchases when the component mounts
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

  // Handle input changes for the client form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClient({ ...client, [name]: value });
  };

  // Handle form submission to update client data
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/clientes/${clientId}/`, client);
      alert('Dados atualizados com sucesso!');
      setIsEditing(false); // Switch back to view mode
    } catch (error) {
      console.error('Erro ao atualizar dados', error);
    }
  };

  // Display loading message while fetching data
  if (!client) return <div>Carregando...</div>;

  return (
    <div className="client-profile">
      <div class="text-center p-5">
        <p Class="fs-1 fw-bold text-capitalize">Perfil de {client.nome}</p>
      </div>
      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cep">CEP:</label>
            <input name="cep" value={client.cep || ''} onChange={handleInputChange} placeholder="CEP" />
          </div>
          <div className="form-group">
            <label htmlFor="cpf_cnpj">CPF/CNPJ:</label>
            <input name="cpf_cnpj" value={client.cpf_cnpj || ''} onChange={handleInputChange} placeholder="CPF/CNPJ" />
          </div>
          <div className="form-group">
            <label htmlFor="celular">Celular:</label>
            <input name="celular" value={client.celular || ''} onChange={handleInputChange} placeholder="Celular" />
          </div>
          <div className="form-group">
            <label htmlFor="endereco">Endereço:</label>
            <input name="endereco" value={client.endereco || ''} onChange={handleInputChange} placeholder="Endereço" />
          </div>
          <div className="form-group">
            <label htmlFor="tipo_pessoa">Tipo de Pessoa:</label>
            <input name="tipo_pessoa" value={client.tipo_pessoa || ''} onChange={handleInputChange} placeholder="Tipo de Pessoa" />
          </div>
          <button type="submit">Atualizar</button>
          <button type="button" onClick={() => setIsEditing(false)}>Cancelar</button>
        </form>
      ) : (
        <>
          <div>
            <p>CEP: {client.cep}</p>
            <p>CPF/CNPJ: {client.cpf_cnpj}</p>
            <p>Celular: {client.celular}</p>
            <p>Endereço: {client.endereco}</p>
            <p>Tipo de Pessoa: {client.tipo_pessoa}</p>
            <button onClick={() => setIsEditing(true)}>Editar</button> {/* Edit button */}
          </div>
        </>
      )}

      <div class="text">
        <p class="pt-5 fs-2 fw-bold text-capitalize">Compras do Cliente</p>
      </div>
      <ClientProfileTable purchases={purchases} />
    </div>
  );
};

export default ClientProfile;
