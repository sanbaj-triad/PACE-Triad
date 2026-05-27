import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const ProjectAttachments = ({ projectId }) => {
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchAttachments();
    }, [projectId]);

    const fetchAttachments = async () => {
        try {
            const res = await api.get(`/projects/${projectId}`);
            if (res.attachments) {
                setAttachments(res.attachments);
            } else {
                setAttachments([]);
            }
        } catch (err) {
            console.error("Failed to load attachments", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadAttachment = async (e) => {
        const file = e.target.files[0];
        if (!file || !projectId) return;
        
        const formData = new FormData();
        formData.append("file", file);
        if (description) {
            formData.append("description", description);
        }
        
        try {
            setUploadingAttachment(true);
            const res = await api.post(`/projects/${projectId}/attachments`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setAttachments([...attachments, res]);
            setDescription(''); // reset description
        } catch (error) {
            console.error("Failed to upload attachment", error);
            alert("Failed to upload attachment");
        } finally {
            setUploadingAttachment(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm("Are you sure you want to delete this attachment?")) return;
        try {
            await api.delete(`/projects/attachments/${attachmentId}`);
            setAttachments(attachments.filter(a => a.id !== attachmentId));
        } catch (error) {
            console.error("Failed to delete attachment", error);
            alert("Failed to delete attachment");
        }
    };

    const handleViewAttachment = async (attachmentId, filename) => {
        // Open a blank tab synchronously to prevent popup blockers
        const newWindow = window.open('', '_blank');
        if (!newWindow) {
            alert("Please allow popups for this site to view attachments.");
            return;
        }
        
        newWindow.document.write('Loading document...');
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/projects/attachments/${attachmentId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Fetch failed");
            
            const rawBlob = await res.blob();
            
            const ext = filename.split('.').pop().toLowerCase();
            let mimeType = 'application/octet-stream';
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'gif') mimeType = 'image/gif';
            else if (ext === 'svg') mimeType = 'image/svg+xml';
            else if (ext === 'txt') mimeType = 'text/plain';
            
            const displayBlob = new Blob([rawBlob], { type: mimeType });
            const url = window.URL.createObjectURL(displayBlob);
            
            newWindow.location.href = url;
            
            // Clean up URL object after a generous delay (e.g., 60 seconds)
            setTimeout(() => {
                try { window.URL.revokeObjectURL(url); } catch (e) {}
            }, 60000);
            
        } catch (error) {
            console.error("Failed to view attachment", error);
            newWindow.close();
            alert("Failed to view attachment");
        }
    };

    const handleDownloadAttachment = async (attachmentId, filename) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/projects/attachments/${attachmentId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Failed to download attachment", error);
            alert("Failed to download attachment");
        }
    };

    const isViewable = (filename) => {
        if (!filename) return false;
        const ext = filename.split('.').pop().toLowerCase();
        return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'txt'].includes(ext);
    };

    if (loading) return <div>Loading attachments...</div>;

    return (
        <div style={{ marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Project Attachments</h3>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                    type="text" 
                    placeholder="Description (optional)" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', width: '300px' }}
                    disabled={uploadingAttachment}
                />
                <label className="btn-secondary" style={{ cursor: uploadingAttachment ? 'not-allowed' : 'pointer', margin: 0 }}>
                    {uploadingAttachment ? 'Uploading...' : 'Upload File'}
                    <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={handleUploadAttachment} 
                        disabled={uploadingAttachment}
                    />
                </label>
            </div>
            
            {attachments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No attachments uploaded yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {attachments.map(att => (
                        <li key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-dark)', marginBottom: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{att.filename}</span>
                                {att.description && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{att.description}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {isViewable(att.filename) && (
                                    <button type="button" onClick={() => handleViewAttachment(att.id, att.filename)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>View</button>
                                )}
                                <button type="button" onClick={() => handleDownloadAttachment(att.id, att.filename)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Download</button>
                                <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ProjectAttachments;
