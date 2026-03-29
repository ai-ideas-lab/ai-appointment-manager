import React from 'react'
import { CircularProgress, Box, Typography } from '@mui/material'

interface LoadingProps {
  message?: string
}

const Loading: React.FC<LoadingProps> = ({ message = '加载中...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}

export default Loading