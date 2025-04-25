import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, CssBaseline, Box, Typography } from '@mui/material';

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <CssBaseline />
      
      <Container component="main" maxWidth="lg">
        <Outlet />
      </Container>

      <Box component="footer" sx={{ backgroundColor: '#fff', borderTop: 1, borderColor: 'divider', py: 2, mt: 4 }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Google Drive Index - Read Only Access
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}