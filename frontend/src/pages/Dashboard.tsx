import React from 'react'
import { Box, Grid, Card, CardContent, Typography, Button, LinearProgress } from '@mui/material'
import { useQuery } from 'react-query'
import { format } from 'dayjs'
import { CalendarToday, TrendingUp, Notifications } from '@mui/icons-material'
import api from '../api'

interface DashboardStats {
  totalAppointments: number
  upcomingAppointments: number
  completedAppointments: number
  todayAppointments: number
}

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    async () => {
      const response = await api.get('/analytics/stats')
      return response.data
    }
  )

  const { data: upcomingAppointments } = useQuery(
    'upcoming-appointments',
    async () => {
      const response = await api.get('/appointments/upcoming?limit=5')
      return response.data
    },
    { refetchInterval: 60000 }
  )

  if (isLoading) {
    return <LinearProgress />
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        仪表板
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CalendarToday color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    总预约数
                  </Typography>
                  <Typography variant="h5" component="div">
                    {stats?.totalAppointments || 0}
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
                <Notifications color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    即将到来
                  </Typography>
                  <Typography variant="h5" component="div">
                    {stats?.upcomingAppointments || 0}
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
                    {stats?.completedAppointments || 0}
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
                <CalendarToday color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    今日预约
                  </Typography>
                  <Typography variant="h5" component="div">
                    {stats?.todayAppointments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              即将到来的预约
            </Typography>
            <Button variant="outlined" href="/appointments">
              查看全部
            </Button>
          </Box>
          
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <Box>
              {upcomingAppointments.map((appointment: any) => (
                <Box key={appointment.id} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography variant="subtitle1">
                    {appointment.title}
                  </Typography>
                  <Typography color="textSecondary" variant="body2">
                    {format(new Date(appointment.startTime), 'YYYY-MM-DD HH:mm')}
                  </Typography>
                  {appointment.location && (
                    <Typography color="textSecondary" variant="body2">
                      📍 {appointment.location}
                    </Typography>
                  )}
                  {appointment.description && (
                    <Typography color="textSecondary" variant="body2">
                      {appointment.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
              暂无即将到来的预约
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            快速操作
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="contained" href="/appointments/new">
              创建新预约
            </Button>
            <Button variant="outlined" href="/calendar">
              查看日历
            </Button>
            <Button variant="outlined" href="/analytics">
              分析报告
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Dashboard