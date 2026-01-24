import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ecosApi } from '../../api/ecos.api';
import { productsApi } from '../../api/products.api';
import type { Product } from '../../api/products.api';

interface CreateECOModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateECOModal = ({ isOpen, onClose, onSuccess }: CreateECOModalProps) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'PRODUCT' | 'BOM'>('PRODUCT');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [versionUpdate, setVersionUpdate] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

    const loadProducts = async () => {
        try {
            const data = await productsApi.getAll();
            setProducts(data);
        } catch (e) {
            console.error('Failed to load products');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!selectedProduct) {
            setError('Please select a product');
            setLoading(false);
            return;
        }

        try {
            await ecosApi.create({
                title,
                type,
                productId: selectedProduct,
                status: 'DRAFT',
                versionUpdate
            });
            onSuccess();
            onClose();
            setTitle('');
            setSelectedProduct('');
            setType('PRODUCT');
            setVersionUpdate(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create ECO');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New ECO"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="ECO Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Upgrade Battery Housing"
                    required
                />

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">ECO Type</label>
                    <select
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-primary"
                        value={type}
                        onChange={(e) => setType(e.target.value as 'PRODUCT' | 'BOM')}
                    >
                        <option value="PRODUCT">Product Change</option>
                        <option value="BOM">BOM Change</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Target Product</label>
                    <select
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-primary"
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                        <option value="">Select a product...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="versionUpdate"
                        checked={versionUpdate}
                        onChange={(e) => setVersionUpdate(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary"
                    />
                    <label htmlFor="versionUpdate" className="text-sm text-zinc-300 select-none">
                        Create new version upon approval?
                    </label>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" isLoading={loading}>Create ECO</Button>
                </div>
            </form>
        </Modal>
    );
};
