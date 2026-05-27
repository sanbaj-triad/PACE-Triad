import React, { useState, useEffect, useRef } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Users, User, Building2, Briefcase, Printer } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSystem } from '../context/SystemContext';
import { LOGO_BASE64 } from '../utils/logoBase64';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const OrgNode = ({ node, dndProps }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 1rem', minWidth: '160px' }}>
            <div 
                draggable={dndProps?.isEditMode && !node.is_root_company}
                onDragStart={(e) => {
                    if (!dndProps?.isEditMode || node.is_root_company) return;
                    e.dataTransfer.setData('text/plain', node.id);
                    if (dndProps.setDraggedNodeId) dndProps.setDraggedNodeId(node.id);
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                    if (!dndProps?.isEditMode) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                    if (!dndProps?.isEditMode) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const dragId = dndProps?.draggedNodeId || parseInt(e.dataTransfer.getData('text/plain') || '0');
                    if (dndProps.handleDrop && dragId) dndProps.handleDrop(dragId, node);
                }}
                style={{ 
                    opacity: dndProps?.draggedNodeId === node.id ? 0.5 : 1,
                    outline: dndProps?.draggedNodeId === node.id ? '2px dashed var(--primary)' : 'none',

                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    border: dndProps?.isExporting ? '2px solid #000' : `1px solid ${node.is_root_company ? 'transparent' : 'var(--border)'}`,
                    background: dndProps?.isExporting ? '#ffffff' : (node.is_root_company ? 'var(--primary)' : 'var(--bg-dark)'),
                    color: dndProps?.isExporting ? '#000000' : (node.is_root_company ? 'white' : 'var(--text-main)'),
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.2s',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                {node.is_root_company ? (
                    <>
                        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: dndProps?.isExporting ? 'transparent' : 'rgba(255,255,255,0.2)', border: dndProps?.isExporting ? '2px solid #000' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <Building2 size={24} color={dndProps?.isExporting ? '#000' : 'white'} />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.25rem' }}>{node.name}</h3>
                    </>
                ) : (
                    <>
                        <div style={{ 
                            width: '3.5rem', 
                            height: '3.5rem', 
                            borderRadius: '50%', 
                            background: dndProps?.isExporting ? 'transparent' : 'rgba(59, 130, 246, 0.1)', 
                            border: dndProps?.isExporting ? '2px solid #000' : '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginBottom: '0.75rem' 
                        }}>
                            {node.first_name ? (
                                <span style={{ fontWeight: 'bold', color: dndProps?.isExporting ? '#000' : 'var(--primary)', fontSize: '1.25rem' }}>
                                    {node.first_name[0]}{node.last_name?.[0]}
                                </span>
                            ) : (
                                <User size={24} color={dndProps?.isExporting ? '#000' : 'var(--primary)'} />
                            )}
                        </div>
                        <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                            {node.first_name} {node.last_name}
                        </h4>
                        
                        {node.title && (
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: dndProps?.isExporting ? '#000' : 'var(--text-secondary)', fontWeight: 500 }}>
                                {node.title}
                            </p>
                        )}
                        
                        {node.department && (
                            <span style={{ 
                                marginTop: '0.75rem', 
                                padding: '0.125rem 0.5rem', 
                                borderRadius: '9999px', 
                                background: dndProps?.isExporting ? 'transparent' : 'rgba(59, 130, 246, 0.1)', 
                                border: dndProps?.isExporting ? '1px solid #000' : 'none',
                                color: dndProps?.isExporting ? '#000' : 'var(--primary)', 
                                fontSize: '0.65rem', 
                                textTransform: 'uppercase', 
                                fontWeight: 'bold', 
                                letterSpacing: '0.05em' 
                            }}>
                                {node.department}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const OrgTreeNode = ({ node, dndProps }) => {
    return (
        <TreeNode label={<OrgNode node={node} dndProps={dndProps} />}>
            {node.children && node.children.map(child => (
                <OrgTreeNode key={child.id} node={child} dndProps={dndProps} />
            ))}
        </TreeNode>
    );
};

const OrgChart = () => {
    const { user } = useAuth();
    const { systemState } = useSystem();
    const isAdmin = user?.role === 'admin' || user?.has_financial_access;
    
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const chartRef = useRef(null);
    
    const defaultRegion = () => {
        if (user) {
            const locName = (user.location?.name || user.region || '').toLowerCase();
            if (locName.includes('asia')) return 'Triad Asia';
        }
        return 'US/Headquarters';
    };
    const [selectedRegion, setSelectedRegion] = useState(defaultRegion);

    // Context asynchronously dropping in protection
    useEffect(() => {
        if (user) {
            const locName = (user.location?.name || user.region || '').toLowerCase();
            if (locName.includes('asia')) {
                setSelectedRegion('Triad Asia');
            } else {
                setSelectedRegion('US/Headquarters');
            }
        }
    }, [user?.id]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.get('/users/');
            const emps = Array.isArray(data) ? data.filter(u => u.is_employee && u.is_active && !u.locked_out) : [];
            setEmployees(emps);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to fetch users');
            setLoading(false);
        }
    };

    const handleDrop = async (draggedId, targetNode) => {
        if (!draggedId || draggedId === targetNode.id) return;
        
        let currentParent = targetNode;
        while (currentParent && !currentParent.is_root_company) {
            let parentId = currentParent.manager_id;
            if (!parentId) break;
            if (parentId === draggedId) {
                alert("Cannot drag a manager underneath one of their own nested reports (cyclic dependency).");
                return;
            }
            currentParent = employees.find(e => e.id === parentId);
        }

        const newManagerId = targetNode.is_root_company ? null : targetNode.id;
        
        const draggedEmp = employees.find(e => e.id === draggedId);
        if (draggedEmp?.manager_id === newManagerId) return;

        try {
            await api.put(`/users/${draggedId}`, { manager_id: newManagerId });
            await fetchUsers(); 
        } catch(error) {
            alert('Failed to update hierarchy manually.');
        } finally {
            setDraggedNodeId(null);
        }
    };

    const exportToPDF = async () => {
        if (!chartRef.current) return;
        setIsExporting(true);
        
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(chartRef.current, {
                    scale: 2,
                    useCORS: true, 
                    backgroundColor: '#ffffff' // Absolute white for printer savings
                });
                
                const imgData = canvas.toDataURL('image/png');
                
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
                const finalWidth = canvas.width * ratio;
                const finalHeight = canvas.height * ratio;
                
                const x = (pdfWidth - finalWidth) / 2;
                const y = (pdfHeight - finalHeight) / 2;
                
                pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

                // Add Logo to top right of header
                const logoWidth = 45;
                const logoHeight = 31;
                pdf.addImage(LOGO_BASE64, 'PNG', pdfWidth - 10 - logoWidth, 10, logoWidth, logoHeight);

                // Footer note
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Generated on ${new Date().toLocaleString()} - PACE v${systemState?.app_version || '1.0.0'}`, 10, pdfHeight - 10);

                pdf.save(`OrgChart_${selectedRegion.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.pdf`);
            } catch (error) {
                console.error('Failed to export PDF:', error);
                alert('Failed to generate PDF.');
            } finally {
                setIsExporting(false);
            }
        }, 150); // Small hook gap to let React visually map Light Mode components to the DOM
    };

    const dndProps = { isEditMode, draggedNodeId, setDraggedNodeId, handleDrop, isExporting };

    const buildTree = (emps) => {
        const empMap = {};
        const roots = [];

        // Register all employees in region
        emps.forEach(emp => {
            empMap[emp.id] = { ...emp, children: [] };
        });

        // Resolve Hierarchy
        emps.forEach(emp => {
            if (emp.manager_id && empMap[emp.manager_id]) {
                empMap[emp.manager_id].children.push(empMap[emp.id]);
            } else {
                // Anyone who doesn't have a manager IN the active region pool becomes a root
                roots.push(empMap[emp.id]);
            }
        });

        return roots;
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Company Directory...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>;

    const getRegionalTreeEmployees = (allEmps, targetRegion) => {
        // Resolve cleanly against Location objects, falling back to legacy region strings
        const checkRegion = (e) => {
             const locName = (e.location?.name || e.region || '').toLowerCase();
             if (targetRegion === 'Triad Asia') {
                 return locName.includes('asia');
             } else {
                 return !locName.includes('asia');
             }
        };
        const includedIds = new Set(allEmps.filter(checkRegion).map(e => e.id));
        
        let added = true;
        while(added) {
            added = false;
            allEmps.forEach(emp => {
                // If this employee is in the set, and they have a manager not in the set, add the manager to bridge the tree
                if (includedIds.has(emp.id) && emp.manager_id && !includedIds.has(emp.manager_id)) {
                    includedIds.add(emp.manager_id);
                    added = true;
                }
            });
        }
        
        return allEmps.filter(e => includedIds.has(e.id));
    };

    const regionalEmployees = getRegionalTreeEmployees(employees, selectedRegion);

    // Filter to ensure floating employees (whose managers aren't in the resolved region tree)
    // properly get attached as sub-roots instead of orphaned, but DO NOT drop missing middle managers.
    const roots = buildTree(regionalEmployees);

    return (
        <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={32} color="var(--primary)" />
                        Company Organization Chart
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Hierarchical overview of all active employee relationships.
                    </p>
                </div>
                <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={20} color="var(--primary)" />
                    <div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Regional Employees</p>
                        <p style={{ margin: 0, fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1 }}>{regionalEmployees.length}</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['US/Headquarters', 'Triad Asia'].map(region => (
                        <button
                            key={region}
                            onClick={() => setSelectedRegion(region)}
                            style={{
                                padding: '0.5rem 1.5rem',
                                border: `1px solid ${selectedRegion === region ? 'transparent' : 'var(--border)'}`,
                                background: selectedRegion === region ? 'var(--primary)' : 'var(--bg-card)',
                                color: selectedRegion === region ? 'white' : 'var(--text-secondary)',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem'
                            }}
                        >
                            {region}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={exportToPDF}
                        disabled={isExporting}
                        style={{
                            padding: '0.5rem 1.5rem',
                            border: `1px solid var(--border)`,
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: isExporting ? 0.7 : 1
                        }}
                    >
                        <Printer size={16} />
                        {isExporting ? 'Exporting...' : 'Print to PDF'}
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{
                                padding: '0.5rem 1.5rem',
                                border: `1px solid ${isEditMode ? 'var(--danger)' : 'var(--border)'}`,
                                background: isEditMode ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
                                color: isEditMode ? 'var(--danger)' : 'var(--text-secondary)',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isEditMode ? 'Save / Default Mode' : '✎ Edit Hierarchy'}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ 
                background: 'var(--bg-dark)', 
                border: '1px solid var(--border)', 
                borderRadius: '0.75rem', 
                padding: '2rem', 
                overflowX: 'auto', 
                minHeight: '600px', 
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
            }}>
                <div ref={chartRef} style={{ display: 'inline-block', minWidth: 'min-content', padding: '2rem', background: isExporting ? '#ffffff' : 'transparent' }}>
                    <Tree
                        lineWidth={isExporting ? '3px' : '2px'}
                        lineColor={isExporting ? '#000000' : 'var(--primary)'}
                        lineBorderRadius={'10px'}
                        label={<OrgNode node={{ is_root_company: true, name: selectedRegion.replace("Triad Asia", "Triad Asia Organization").replace("US/Headquarters", "US/Headquarters Organization") }} dndProps={dndProps} />}
                    >
                        {roots.map(rootNode => (
                            <OrgTreeNode key={rootNode.id} node={rootNode} dndProps={dndProps} />
                        ))}
                    </Tree>
                </div>
            </div>
        </div>
    );
};

export default OrgChart;
