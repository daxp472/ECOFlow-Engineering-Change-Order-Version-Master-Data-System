import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products.api';
import type { Product, ProductVersion } from '../api/products.api';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Package, Archive, Layers, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProductDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [versions, setVersions] = useState<ProductVersion[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.roles?.includes('ADMIN');
    const isEngineering = user?.roles?.includes('ENGINEERING') || isAdmin;

    useEffect(() => {
        if (id) {
            loadProduct(id);
        }
    }, [id]);

    const loadProduct = async (productId: string) => {
        setLoading(true);
        try {
            // Fetch product details
            const productData = await productsApi.getById(productId);
            setProduct(productData || null);

            // Assume getById returns versions in a property or we fetch them separately
            // Based on checking the controller, getProductById returns { product: { versions: [...] } }
            // But our api wrapper unwrap it to response.data.data.product
            // Let's assume the API returns the product with versions included as per controller logic.
            if (productData && (productData as any).versions) {
                setVersions(Array.isArray((productData as any).versions) ? (productData as any).versions : []);
            } else {
                setVersions([]);
            }

        } catch (error) {
            console.error('Failed to load product', error);
            setProduct(null);
            setVersions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!product || !confirm('Are you sure you want to archive this product? This action cannot be undone easily.')) return;
        try {
            await productsApi.archive(product.id);
            alert('Product archived successfully');
            navigate('/products');
        } catch (error) {
            console.error('Failed to archive product', error);
            alert('Failed to archive product');
        }
    };

    if (loading) return <div className="text-zinc-500">Loading product details...</div>;
    if (!product) return <div className="text-zinc-500">Product not found</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/products')} className="pl-0 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Products
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">{product.name}</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${product.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                product.status === 'ARCHIVED' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                            {product.status}
                        </span>
                    </div>
                    <p className="text-zinc-400">
                        Created: {new Date(product.createdAt).toLocaleDateString()} •
                        Last Updated: {new Date(product.updatedAt).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex gap-3">
                    {isAdmin && product.status !== 'ARCHIVED' && (
                        <Button variant="outline" onClick={handleArchive} className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10">
                            <Archive className="w-4 h-4 mr-2" /> Archive Product
                        </Button>
                    )}
                    {isEngineering && product.status === 'ACTIVE' && (
                        <Button onClick={() => navigate('/ecos')} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create ECO
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 rounded-xl border border-white/5"
                >
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Version History
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs uppercase text-zinc-500 bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Version</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Sale Price</th>
                                    <th className="px-4 py-3">Cost Price</th>
                                    <th className="px-4 py-3 rounded-r-lg">Created Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {versions.length > 0 ? (
                                    versions.map((ver) => (
                                        <tr key={ver.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white font-mono">{ver.version}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full border ${ver.status === 'ACTIVE' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                        ver.status === 'ARCHIVED' ? 'text-zinc-500 border-zinc-500/20 bg-zinc-500/10' :
                                                            'text-amber-500 border-amber-500/20 bg-amber-500/10'
                                                    }`}>
                                                    {ver.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300">${ver.salePrice}</td>
                                            <td className="px-4 py-3 text-zinc-300">${ver.costPrice}</td>
                                            <td className="px-4 py-3 text-zinc-400">{new Date(ver.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                            No version history available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
