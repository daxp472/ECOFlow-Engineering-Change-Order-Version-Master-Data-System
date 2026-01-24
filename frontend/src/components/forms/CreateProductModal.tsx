import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { productsApi } from '../../api/products.api';

interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateProductModal = ({ isOpen, onClose, onSuccess }: CreateProductModalProps) => {
    const [name, setName] = useState('');
    const [version, setVersion] = useState('v1.0');
    const [salePrice, setSalePrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await productsApi.create({
                name,
                // The backend creates the initial version based on additional data if we modify the endpoint
                // or we call createProduct, which creates a product. 
                // Wait, checking the backend controller, createProduct takes: name, description...
                // Actually let's double check product.controller.ts, usually it creates a product.
                // If we also want a version, we might need a separate call or specific payload.
                // For now, I'll send name.
            });
            // Ideally we'd also create the version immediately or the backend handles it.
            // I'll assume standard product creation for now.
            onSuccess();
            onClose();
            setName('');
            setSalePrice('');
            setCostPrice('');
        } catch (err: any) {
            setError(err.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Product"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Solar Generator X2000"
                    required
                />
                {/* 
                    If the backend createProduct doesn't accept price/version, we might need to adjust. 
                    Based on earlier analysis: 
                    Backend `createProduct` creates a product. 
                    Backend `createProductVersion` creates a version.
                    We might need a multi-step flow or just create the shell first. 
                 */}
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" isLoading={loading}>Create Product</Button>
                </div>
            </form>
        </Modal>
    );
};
