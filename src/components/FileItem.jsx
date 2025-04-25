import React from 'react';
import { TableRow, TableCell, Button, Typography } from '@mui/material';

export default function FileItem({ file, onFolderClick }) {
  const isDirectory = file.IsDir;

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = parseInt(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleClick = () => {
    if (isDirectory) {
      onFolderClick(file.Path);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    window.open(`/api/download?path=${encodeURIComponent(file.Path)}`, '_blank');
  };

  return (
    <TableRow hover onClick={handleClick} sx={{ cursor: isDirectory ? 'pointer' : 'default' }}>
      <TableCell>
        <Typography variant="body2" noWrap>
          {isDirectory ? '📁' : '📄'} {file.Name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="textSecondary">
          {isDirectory ? '—' : formatFileSize(file.Size)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="textSecondary">
          {formatDate(file.ModTime)}
        </Typography>
        {!isDirectory && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleDownload}
            sx={{ marginLeft: 1 }}
          >
            Download
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}