import { useState, useEffect } from "react";
import { fetchProducts } from "../services/productService";

export default function useProducts(cabangId, isAdmin = false) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchProducts(cabangId, isAdmin)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cabangId, isAdmin]);

  return { products, loading, error, refetch: () => {
    setLoading(true);
    fetchProducts(cabangId, isAdmin).then(setProducts).catch(err => setError(err.message)).finally(() => setLoading(false));
  } };
}
