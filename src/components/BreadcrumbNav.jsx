import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';

export default function BreadcrumbNav({ breadcrumbs, onNavigate }) {
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ marginBottom: 2 }}>
      {breadcrumbs.map((crumb, index) => (
        <Link
          key={crumb.path}
          color={index === breadcrumbs.length - 1 ? 'textPrimary' : 'inherit'}
          underline="hover"
          onClick={() => onNavigate(crumb.path)}
          sx={{ cursor: 'pointer' }}
        >
          {crumb.name}
        </Link>
      ))}
    </Breadcrumbs>
  );
}