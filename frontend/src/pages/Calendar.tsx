import React from 'react'
import { Typography, Paper, Box } from '@mui/material'
import { CalendarToday } from '@mui/icons-material'

const Calendar: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        日历同步
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CalendarToday sx={{ mr: 2 }} />
          <Typography variant="h6">
            日历集成功能开发中
          </Typography>
        </Box>
        <Typography>
          此功能将支持与 Google Calendar、Apple Calendar、Outlook 等日历服务的双向同步。
        </Typography>
      </Paper>
    </Box>
  )
}

export default Calendar