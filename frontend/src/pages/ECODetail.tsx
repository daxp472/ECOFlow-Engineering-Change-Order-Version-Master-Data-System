import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ecosApi } from '../api/ecos.api';
import type { ECO } from '../api/ecos.api';
import { Button } from '../components/ui/Button';
import { AttachmentSection } from '../components/ui/AttachmentSection';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export const ECODetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [eco, setEco] = useState<ECO | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEngineering = user?.roles?.includes('ENGINEERING') || user?.roles?.includes('ADMIN');
    const isApprover = user?.roles?.includes('APPROVER') || user?.roles?.includes('ADMIN');
    const isAdmin = user?.roles?.includes('ADMIN');

    useEffect(() => {
        if (id) {
            loadECO(id);
        }
    }, [id]);

    const loadECO = async (ecoId: string) => {
        setLoading(true);
        try {
            const data = await ecosApi.getById(ecoId);
            setEco(data || null);
        } catch (error) {
            console.error('Failed to load ECO', error);
            setEco(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!eco || isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            await ecosApi.submit(eco.id);
            alert('✅ ECO submitted for approval!');
            await loadECO(eco.id);
        } catch (error: any) {
            console.error('Failed to submit ECO', error);
            const errorMsg = error?.response?.data?.message || 'Failed to submit ECO';
            alert('❌ ' + errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
        if (!eco || isReviewing) return;
        
        setIsReviewing(true);
        try {
            await ecosApi.review(eco.id, status, reviewComment);
            setReviewComment('');
            await loadECO(eco.id);
        } catch (error) {
            console.error('Failed to review ECO', error);
        } finally {
            setIsReviewing(false);
        }
    };

    if (loading) return <div className="text-zinc-500">Loading ECO details...</div>;
    if (!eco) return <div className="text-zinc-500">ECO not found</div>;

    const canSubmit = isEngineering && eco.status === 'DRAFT';
    const canReview = isApprover && eco.status === 'IN_PROGRESS';
    const canApprove = isAdmin && eco.status === 'IN_PROGRESS';

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/ecos')} className="pl-0 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to ECOs
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{eco.title}</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${eco.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                eco.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                    eco.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                            {eco.status}
                        </span>
                    </div>
                    <p className="text-zinc-400">
                        Product: <span className="text-zinc-300">{eco.product?.name || 'N/A'}</span> •
                        Type: <span className="text-zinc-300">{eco.type}</span> •
                        {eco.type === 'BOM' && eco.bom && (
                            <>
                                BOM Version: <span className="text-zinc-300">{eco.bom.version}</span> •
                            </>
                        )}
                        Stage: <span className="text-zinc-300">{eco.currentStage}</span> •
                        Created: {new Date(eco.createdAt).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex gap-3">
                    {canSubmit && (
                        <Button 
                            onClick={handleSubmit} 
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span> Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> Submit for Approval
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Changes */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 rounded-xl border border-white/5"
                    >
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Change Details
                        </h2>

                        <div className="space-y-4">
                            {/* Description */}
                            {eco.draftData?.description && (
                                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Description</label>
                                    <p className="text-zinc-200 mt-1">{eco.draftData.description}</p>
                                </div>
                            )}

                            {/* Product Changes */}
                            {eco.draftData?.product && (Object.keys(eco.draftData.product).length > 0) && (
                                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">Product Price Changes</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {eco.draftData.product.salePrice !== undefined && (
                                            <div className="bg-zinc-800/50 rounded-lg p-3">
                                                <span className="text-xs text-zinc-500">New Sale Price</span>
                                                <p className="text-lg font-semibold text-emerald-400">
                                                    ${eco.draftData.product.salePrice.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                        {eco.draftData.product.costPrice !== undefined && (
                                            <div className="bg-zinc-800/50 rounded-lg p-3">
                                                <span className="text-xs text-zinc-500">New Cost Price</span>
                                                <p className="text-lg font-semibold text-amber-400">
                                                    ${eco.draftData.product.costPrice.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* BOM Changes */}
                            {eco.draftData?.bom && (
                                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">BOM Changes</label>
                                    
                                    {/* Components */}
                                    {eco.draftData.bom.components?.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-zinc-400 mb-2">📦 Components</h4>
                                            <div className="space-y-2">
                                                {eco.draftData.bom.components.map((comp: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center bg-zinc-800/50 rounded-lg p-3">
                                                        <div>
                                                            <span className="text-zinc-200 font-medium">{comp.name || comp.productId || `Component ${i+1}`}</span>
                                                            {comp.productId && <span className="text-xs text-zinc-500 ml-2">ID: {comp.productId}</span>}
                                                        </div>
                                                        <span className="text-amber-400 font-semibold">Qty: {comp.quantity || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Operations */}
                                    {eco.draftData.bom.operations?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-zinc-400 mb-2">⚙️ Operations</h4>
                                            <div className="space-y-2">
                                                {eco.draftData.bom.operations.map((op: any, i: number) => (
                                                    <div key={i} className="bg-zinc-800/50 rounded-lg p-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <span className="text-zinc-200 font-medium">{op.name || `Operation ${i+1}`}</span>
                                                                {op.workCenter && (
                                                                    <p className="text-xs text-zinc-500 mt-1">Work Center: {op.workCenter}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                {op.time !== undefined && (
                                                                    <span className="text-blue-400 font-semibold">{op.time} min</span>
                                                                )}
                                                                {op.sequence !== undefined && (
                                                                    <p className="text-xs text-zinc-500 mt-1">Seq: {op.sequence}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Empty State */}
                                    {(!eco.draftData.bom.components || eco.draftData.bom.components.length === 0) &&
                                     (!eco.draftData.bom.operations || eco.draftData.bom.operations.length === 0) && (
                                        <p className="text-zinc-500 text-sm">No component or operation changes specified</p>
                                    )}
                                </div>
                            )}

                            {/* Empty State */}
                            {(!eco.draftData || Object.keys(eco.draftData).length === 0) && (
                                <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center">
                                    <p className="text-zinc-500">No change details specified</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* ECO Attachments */}
                    <AttachmentSection
                        entityType="eco"
                        entityId={eco.id}
                        entityStatus={eco.status}
                        canUpload={isEngineering || false}
                        canDelete={isEngineering || false}
                    />

                    {/* Approval History */}
                    {/* Note: Assuming 'approvals' is populated in the ECO response.
                         If not, we might need to adjust the API or this view. */}
                </div>

                {/* Sidebar - Actions & Timeline */}
                <div className="space-y-6">
                    {canReview && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-6 rounded-xl border border-white/5 bg-primary/5"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Review Action</h3>
                            <div className="space-y-4">
                                <textarea
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary resize-none h-24"
                                    placeholder="Add review comments..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    disabled={isReviewing}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={() => handleReview('APPROVED')}
                                        className="bg-emerald-600 hover:bg-emerald-700 w-full"
                                        disabled={isReviewing}
                                    >
                                        {isReviewing ? (
                                            <>
                                                <span className="animate-spin mr-2">⏳</span> Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => handleReview('REJECTED')}
                                        variant="outline"
                                        className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10 w-full"
                                        disabled={isReviewing}
                                    >
                                        {isReviewing ? (
                                            <>
                                                <span className="animate-spin mr-2">⏳</span> Processing...
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {canApprove && !canReview && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-6 rounded-xl border border-white/5 bg-emerald-500/5"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">🔑 Admin Direct Approval</h3>
                            <p className="text-sm text-zinc-400 mb-4">As ADMIN, you can directly approve this ECO</p>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleReview('APPROVED')}
                                    className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                                    disabled={isReviewing}
                                >
                                    {isReviewing ? (
                                        <>
                                            <span className="animate-spin mr-2">⏳</span> Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Approve ECO
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => handleReview('REJECTED')}
                                    variant="outline"
                                    className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                                    disabled={isReviewing}
                                >
                                    {isReviewing ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    <div className="glass-card p-6 rounded-xl border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-zinc-400" />
                            Timeline
                        </h3>
                        {/* Placeholder for real timeline data */}
                        <div className="relative border-l border-zinc-800 ml-2 space-y-6 py-2">
                            <div className="ml-6 relative">
                                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-900"></span>
                                <p className="text-sm font-medium text-white">Created</p>
                                <p className="text-xs text-zinc-500">{new Date(eco.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="ml-6 relative">
                                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-900"></span>
                                <p className="text-sm font-medium text-white">Last Updated</p>
                                <p className="text-xs text-zinc-500">{new Date(eco.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
