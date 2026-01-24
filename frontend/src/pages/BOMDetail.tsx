import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bomsApi } from '../api/boms.api';
import type { BOM } from '../api/boms.api';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Layers, Component, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export const BOMDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [bom, setBom] = useState<BOM | null>(null);
    const [loading, setLoading] = useState(true);

    const isEngineering = user?.roles?.includes('ENGINEERING') || user?.roles?.includes('ADMIN');

    useEffect(() => {
        if (id) {
            loadBOM(id);
        }
    }, [id]);

    const loadBOM = async (bomId: string) => {
        setLoading(true);
        try {
            const data = await bomsApi.getById(bomId);
            setBom(data);
        } catch (error) {
            console.error('Failed to load BOM', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-zinc-500">Loading BOM details...</div>;
    if (!bom) return <div className="text-zinc-500">BOM not found</div>;

    const components = bom.components || [];
    const operations = bom.operations || [];

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/boms')} className="pl-0 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to BOMs
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">BOM {bom.version}</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${bom.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            bom.status === 'ARCHIVED' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                            {bom.status}
                        </span>
                    </div>
                    {/* Assuming BOM has productVersion info if fetched via getById with includes */}
                    {/* The API interface might need updating if productVersion is not on BOM type */}
                    <p className="text-zinc-400">
                        Created: {new Date(bom.createdAt).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex gap-3">
                    {isEngineering && bom.status === 'ACTIVE' && (
                        <Button onClick={() => navigate('/ecos')} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create ECO
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Components Table */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-6 rounded-xl border border-white/5"
                >
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Component className="w-5 h-5 text-primary" />
                        Components ({components.length})
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs uppercase text-zinc-500 bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Product</th>
                                    <th className="px-4 py-3 rounded-r-lg">Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {components.length > 0 ? (
                                    components.map((comp) => (
                                        <tr key={comp.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white">
                                                {comp.product?.name || comp.productId}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300">{comp.quantity}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                                            No components
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Operations Table */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 rounded-xl border border-white/5"
                >
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-zinc-400" />
                        Operations ({operations.length})
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs uppercase text-zinc-500 bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Seq</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Work Center</th>
                                    <th className="px-4 py-3 rounded-r-lg">Time (m)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {operations.length > 0 ? (
                                    operations.map((op) => (
                                        <tr key={op.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-zinc-500 font-mono">{op.sequence}</td>
                                            <td className="px-4 py-3 text-white">{op.name}</td>
                                            <td className="px-4 py-3 text-zinc-300">{op.workCenter}</td>
                                            <td className="px-4 py-3 text-zinc-300">{op.time}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                                            No operations
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
