import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FileList from './FileList';
import BreadcrumbNav from './BreadcrumbNav';
import { Box, Typography } from '@mui/material';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState([{ path: '/', name: 'My Drive' }]);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const pathFromQuery = queryParams.get('path') || '/';
    setCurrentPath(pathFromQuery);
    fetchFiles(pathFromQuery);
  }, [location.search]);

  const fetchFiles = async (path) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data);

      if (path === '/') {
        setBreadcrumbs([{ path: '/', name: 'My Drive' }]);
      } else {
        const parts = path.split('/').filter(Boolean);
        const newBreadcrumbs = [{ path: '/', name: 'My Drive' }];

        let currentBuildPath = '';
        parts.forEach((part) => {
          currentBuildPath += '/' + part;
          newBreadcrumbs.push({
            path: currentBuildPath,
            name: part,
          });
        });

        setBreadcrumbs(newBreadcrumbs);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderPath) => {
    navigate(`/?path=${encodeURIComponent(folderPath)}`);
  };

  const handleBreadcrumbClick = (path) => {
    navigate(`/?path=${encodeURIComponent(path)}`);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Google Drive Index
      </Typography>

      <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbClick} />

      <FileList
        files={files}
        loading={loading}
        error={error}
        onFolderClick={handleFolderClick}
        currentPath={currentPath}
      />
    </Box>
  );
}