import re

with open('frontend/src/components/ProjectForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
if 'const [attachments, setAttachments] = useState([]);' not in content:
    content = content.replace(
        'const [initialLoading, setInitialLoading] = useState(true);',
        'const [initialLoading, setInitialLoading] = useState(true);\n    const [attachments, setAttachments] = useState([]);\n    const [uploadingAttachment, setUploadingAttachment] = useState(false);'
    )

# 2. Add to loadData inside useEffect
if 'setAttachments(projectData.attachments || []);' not in content:
    content = content.replace(
        'setHasInvoices(true);\n                    }',
        'setHasInvoices(true);\n                    }\n                    setAttachments(projectData.attachments || []);'
    )

# 3. Add handler functions right before render
handlers = """
    const handleUploadAttachment = async (e) => {
        const file = e.target.files[0];
        if (!file || !id) return;
        
        const formData = new FormData();
        formData.append("file", file);
        
        try {
            setUploadingAttachment(true);
            const res = await api.post(`/projects/${id}/attachments`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setAttachments([...attachments, res]);
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

    if (initialLoading) return <div className="loading">Loading Project Data...</div>;
"""
if 'handleUploadAttachment' not in content:
    content = content.replace(
        'if (initialLoading) return <div className="loading">Loading Project Data...</div>;',
        handlers
    )

# 4. Add UI section before save buttons
ui_section = """
                    {isEdit && (
                        <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Project Attachments</h3>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
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
                                            <span style={{ color: 'var(--text-main)' }}>{att.filename}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button type="button" onClick={() => handleDownloadAttachment(att.id, att.filename)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Download</button>
                                                <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>"""

if 'Project Attachments' not in content:
    content = content.replace(
        '<div style={{ display: \'flex\', gap: \'1rem\', justifyContent: \'flex-end\', marginTop: \'2rem\' }}>',
        ui_section
    )

with open('frontend/src/components/ProjectForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to ProjectForm.jsx")
