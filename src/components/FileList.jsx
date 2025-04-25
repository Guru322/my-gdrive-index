import React from 'react';
import { Box, CircularProgress, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import FileItem from './FileItem';

export default function FileList({ files, loading, error, onFolderClick, currentPath }) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ backgroundColor: '#fdecea', padding: 2, borderRadius: 1 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Box sx={{ backgroundColor: '#f5f5f5', padding: 2, borderRadius: 1, textAlign: 'center' }}>
        <Typography color="textSecondary">This folder is empty</Typography>
      </Box>
    );
  }

  const sortedFiles = [...files].sort((a, b) => {
    if (a.IsDir && !b.IsDir) return -1;
    if (!a.IsDir && b.IsDir) return 1;
    return a.Name.localeCompare(b.Name);
  });

  return (
    <TableContainer component={Paper} sx={{ marginTop: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Modified</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {currentPath !== '/' && (
            <TableRow hover onClick={() => {
              const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
              onFolderClick(parentPath);
            }}>
              <TableCell colSpan={3} sx={{ cursor: 'pointer' }}>
                ..
              </TableCell>
            </TableRow>
          )}
          {sortedFiles.map((file) => (
            <FileItem key={file.Path} file={file} onFolderClick={onFolderClick} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}