import React, { useState } from 'react';
import apiClient from '../api/apiClient';

export const cryptoUUIDv4 = () => {
  return 'ik_xxxx_4xxx_yxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function TransferForm() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransferSubmit = async (e) => {
    e.preventDefault();

    // Generate a unique transaction tracking key before making the request
    const uniqueIdempotencyKey = `ik_client_${cryptoUUIDv4()}`;

    try {
      const res = await apiClient.post('/wallet/transfer', 
        { recipientEmail, amount: parseFloat(amount) },
        { headers: { 'idempotency-key': uniqueIdempotencyKey } }
      );
      alert(`Transfer Completed! Reference ID: ${res.data.transactionId}`);
    } catch (err) {
      alert(`Transaction Rejected: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <form onSubmit={handleTransferSubmit}>
      <input type="email" onChange={(e) => setRecipientEmail(e.target.value)} required />
      <input type="number" step="0.01" onChange={(e) => setAmount(e.target.value)} required />
      <button type="submit">Send Funds</button>
    </form>
  );
}
