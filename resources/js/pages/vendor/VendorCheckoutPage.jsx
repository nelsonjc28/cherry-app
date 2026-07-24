import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VendorPages.css';

/**
 * Página deprecada: los vendedores ahora hacen checkout desde /carrito-detalle.
 */
const VendorCheckoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/carrito-detalle', { replace: true });
  }, [navigate]);

  return null;
};

export default VendorCheckoutPage;