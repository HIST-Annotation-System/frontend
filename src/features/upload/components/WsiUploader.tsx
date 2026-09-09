import React, { useState } from 'react';
import {
  startMultipartUpload,
  getPresignedUrls,
  refreshPresignedUrls,
  completeMultipartUpload,
  uploadChunkToS3
} from '../../../services/uploadApi';
import type { UploadPart } from '../../../types/upload';
import './WsiUploader.css';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB

const WsiUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setProgress(0);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setMessage('Starting upload session...');

    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    
    try {
      const startRes = await startMultipartUpload(file.name);
      const { upload_id, key } = startRes;

      setMessage('Generating presigned URLs...');
      const urlsRes = await getPresignedUrls(upload_id, key, totalParts);
      let urls = urlsRes.urls;

      setMessage('Uploading data chunks directly to Storage...');
      const parts: UploadPart[] = [];
      let uploadedBytes = 0;

      let pendingParts = Array.from({ length: totalParts }, (_, i) => i);
      
      let i = 0;
      while (i < pendingParts.length) {
        const partIndex = pendingParts[i];
        const start = partIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        try {
          const etag = await uploadChunkToS3(urls[partIndex], chunk, (progressEvent) => {
            if (progressEvent.total) {
              const currentChunkProgress = progressEvent.loaded;
              const totalUploaded = uploadedBytes + currentChunkProgress;
              setProgress(Math.round((totalUploaded / file.size) * 100));
            }
          });

          parts.push({
            PartNumber: partIndex + 1,
            ETag: etag
          });

          uploadedBytes += chunk.size;
          setProgress(Math.round((uploadedBytes / file.size) * 100));
          i++;
        } catch (error: any) {
          if (error?.response?.status === 403) {
            setMessage('Refreshing access tokens...');
            
            const remainingParts = pendingParts.slice(i).map(idx => idx + 1);
            const refreshRes = await refreshPresignedUrls(upload_id, key, remainingParts);
            
            for (const [pNumber, newUrl] of Object.entries(refreshRes.urls)) {
              urls[Number(pNumber) - 1] = newUrl;
            }
            
            setMessage('Resuming upload...');
          } else {
            throw error;
          }
        }
      }

      setMessage('Finalizing and merging WSI image on server...');
      const completeRes = await completeMultipartUpload(upload_id, key, parts);
      
      setStatus('completed');
      setMessage(completeRes.message);

    } catch (error: any) {
      console.error("Upload error:", error);
      setStatus('error');
      setMessage(error?.response?.data?.detail || error.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="wsi-uploader-container">
      <h2>WSI Image Upload (Multipart S3)</h2>
      
      <div className="uploader-controls">
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={status === 'uploading'}
          accept=".tiff,.svs,.ndpi,.mrxs"
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || status === 'uploading'}
        >
          {status === 'uploading' ? 'Uploading...' : 'Start Upload'}
        </button>
      </div>

      {status !== 'idle' && (
        <div className="progress-section">
          <progress value={progress} max="100" className="wsi-progress-bar" />
          <span className="progress-text">{progress}%</span>
          <p className="status-message">{message}</p>
        </div>
      )}
    </div>
  );
};

export default WsiUploader;
