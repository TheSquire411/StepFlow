import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';

interface SystemConfig {
    id: string;
    key: string;
    value: string;
    description: string;
    category: 'general' | 'security' | 'performance' | 'features' | 'limits';
    type: 'string' | 'number' | 'boolean' | 'json';
    isEditable: boolean;
    updatedAt: string;
    updatedBy: string;
}

export const SystemConfig: React.FC = () => {
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingConfig, setEditingConfig] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await adminService.getSystemConfig();
            setConfigs(data);
        } catch (error) {
            console.error('Failed to fetch system config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (config: SystemConfig) => {
        setEditingConfig(config.key);
        setEditValue(config.value);
    };

    const handleSave = async (key: string) => {
        try {
            setSaving(key);
            await adminService.updateSystemConfig(key, editValue);
            await fetchConfigs();
            setEditingConfig(null);
            setEditValue('');
        } catch (error) {
            console.error('Failed to update config:', error);
        } finally {
            setSaving(null);
        }
    };

    const handleCancel = () => {
        setEditingConfig(null);
        setEditValue('');
    };

    const formatValue = (config: SystemConfig) => {
        if (config.type === 'boolean') {
            return config.value === 'true' ? 'Enabled' : 'Disabled';
        }
        if (config.type === 'json') {
            try {
                return JSON.stringify(JSON.parse(config.value), null, 2);
            } catch {
                return config.value;
            }
        }
        return config.value;
    };

    const renderEditInput = (config: SystemConfig) => {
        if (config.type === 'boolean') {
            return (
                <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                </select>
            );
        }

        if (config.type === 'json') {
            return (
                <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Enter valid JSON"
                />
            );
        }

        return (
            <input
                type={config.type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        );
    };

    const filteredConfigs = configs.filter(config => {
        const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
        const matchesSearch = config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            config.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'general', label: 'General' },
        { value: 'security', label: 'Security' },
        { value: 'performance', label: 'Performance' },
        { value: 'features', label: 'Features' },
        { value: 'limits', label: 'Limits' },
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">System Configuration</h2>
                <p className="text-gray-600">Manage system settings and feature flags</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                    <input
                        type="text"
                        placeholder="Search configuration keys..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {categories.map(category => (
                        <option key={category.value} value={category.value}>
                            {category.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Configuration List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-pulse">Loading configuration...</div>
                    </div>
                ) : filteredConfigs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No configuration items found
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredConfigs.map((config) => (
                            <div key={config.key} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-medium text-gray-900">{config.key}</h3>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.category === 'security' ? 'bg-red-100 text-red-800' :
                                                    config.category === 'performance' ? 'bg-yellow-100 text-yellow-800' :
                                                        config.category === 'features' ? 'bg-blue-100 text-blue-800' :
                                                            config.category === 'limits' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}>
                                                {config.category}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {config.type}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-3">{config.description}</p>

                                        {editingConfig === config.key ? (
                                            <div className="space-y-3">
                                                {renderEditInput(config)}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSave(config.key)}
                                                        disabled={saving === config.key}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        {saving === config.key ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                                            {formatValue(config)}
                                                        </pre>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Last updated: {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
                                                    </div>
                                                </div>
                                                {config.isEditable && (
                                                    <button
                                                        onClick={() => handleEdit(config)}
                                                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Warning Notice */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <span className="text-yellow-600">⚠️</span>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                            Configuration Changes Warning
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                            <p>
                                Changes to system configuration may affect application behavior and performance.
                                Some changes may require a system restart to take effect. Please ensure you understand
                                the impact of each setting before making modifications.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
