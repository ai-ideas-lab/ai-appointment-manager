import React from 'react'
import { Typography, Paper, Box, Grid, Card, CardContent } from '@mui/material'
import { useQuery } from 'react-query'
import { TrendingUp, CalendarToday, Clock, BarChart } from '@mui/icons-material'
import api from '../api'

interface AnalyticsData {
  totalAppointments: number
  completedAppointments: number
  upcomingAppointments: number
  appointmentTypes: { type: string; count: number }[]
  dailyStats: { date: string; count: number }[]
}

const Analytics: React.FC = () => {
  const { data: analytics } = useQuery<AnalyticsData>(
    'analytics-data',
    async () => {
      const response = await api.get('/analytics/comprehensive')
      return response.data
    }
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        数据分析
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BarChart color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    总预约数
                  </Typography>
                  <Typography variant="h5" component="div">
                    {analytics?.totalAppointments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    已完成
                  </Typography>
                  <Typography variant="h5" component="div">
                    {analytics?.completedAppointments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CalendarToday color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    即将到来
                  </Typography>
                  <Typography variant="h5" component="div">
                    {analytics?.upcomingAppointments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Clock color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    完成率
                  </Typography>
                  <Typography variant="h5" component="div">
                    {analytics?.totalAppointments 
                      ? Math.round((analytics.completedAppointments / analytics.totalAppointments) * 100)
                      : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          预约类型分布
        </Typography>
        <Box>
          {analytics?.appointmentTypes?.map((type) => (
            <Box key={type.type} sx={{ mb: 2 }}>
              <Typography variant="body1">
                {type.type}: {type.count}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          每日预约统计
        </Typography>
        <Typography variant="body2" color="text.secondary">
          此功能将显示详细的日预约数据图表和趋势分析。
        </Typography>
      </Paper>
    </Box>
  )
}

export default Analytics