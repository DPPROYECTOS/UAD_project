import React, { useState } from 'react';
import { uploadFile } from '../services/supabaseService';
import { UploadIcon } from './Icons';
import Spinner from './Spinner';

interface FileUploadCardProps {
    onUploadSuccess: () => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({ onUploadSuccess }) => {
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
        setIsDragging(true);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        try {
            await uploadFile(file);
            onUploadSuccess();
            setFile(null);
        } catch (err) {
            setError('Failed to upload file. Please try again.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md h-full">
            <h2 className="text-xl font-bold mb-4">Upload Files</h2>
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600'
                }`}
            >
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <label htmlFor="file-upload" className="relative cursor-pointer">
                    <span className="text-primary font-semibold">Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                </label>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">or drag and drop</p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">PDF, DOC, DOCX, XLS, XLSX</p>
            </div>
            {file && (
                <div className="mt-4 flex items-center justify-between bg-light-bg dark:bg-dark-bg p-3 rounded-lg">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-primary/50"
                    >
                        {isUploading ? <Spinner /> : 'Upload'}
                    </button>
                </div>
            )}
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default FileUploadCard;
