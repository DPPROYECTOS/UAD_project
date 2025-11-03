import React, { useState } from 'react';
import { UploadIcon } from './Icons';
import Spinner from './Spinner';
import { uploadDocument as uploadFile } from '../services/supabaseService';


interface FileUploadCardProps {
    onUploadSuccess: () => void;
    folderId: string;
    projectId: string | null;
    userPermissions: any;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({ onUploadSuccess, folderId, projectId, userPermissions }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (allowedTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Invalid file type. Please upload PDF, Word, or Excel files.');
                setFile(null);
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (userPermissions?.canUpload) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (userPermissions?.canUpload && e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        try {
            await uploadFile(file, folderId, projectId);
            onUploadSuccess();
            setFile(null);
        } catch (err) {
            setError('Failed to upload file. Please try again.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    if (!userPermissions?.canUpload) {
         return (
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>No tienes permiso para subir archivos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-300 dark:border-gray-600'
                }`}
            >
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <label htmlFor="file-upload" className="relative cursor-pointer">
                    <span className="text-brand-primary font-semibold">Sube un archivo</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                </label>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">o arrastra y suelta</p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">PDF, DOC, DOCX, XLS, XLSX</p>
            </div>
            {file && (
                <div className="mt-4">
                    <div className="flex items-center justify-between bg-light-bg dark:bg-dark-bg p-3 rounded-lg border border-light-border dark:border-dark-border">
                        <p className="text-sm font-medium truncate flex-1 mr-4">{file.name}</p>
                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="flex-shrink-0 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-brand-primary/50"
                        >
                            {isUploading ? <Spinner size="sm" /> : 'Subir'}
                        </button>
                    </div>
                     <button
                        onClick={() => setFile(null)}
                        className="w-full mt-2 text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancelar
                    </button>
                </div>
            )}
            {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
        </div>
    );
};

export default FileUploadCard;
