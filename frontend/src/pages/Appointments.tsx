import React, { useState } from 'react'
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from '@mui/material'
import { format } from 'dayjs'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '../api'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string
  description?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  type: 'meeting' | 'appointment' | 'reminder' | 'other'
}

const Appointments: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment> | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    status: 'pending' as const,
    type: 'meeting' as const,
  })
  
  const queryClient = useQueryClient()

  const { data: appointments, isLoading } = useQuery(
    'appointments',
    async () => {
      const response = await api.get('/appointments')
      return response.data
    }
  )

  const createMutation = useMutation(
    (newAppointment: Omit<Appointment, 'id'>) =>
      api.post('/appointments', newAppointment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments')
        handleCloseDialog()
      },
    }
  )

  const updateMutation = useMutation(
    (appointment: { id: string; data: Partial<Appointment> }) =>
      api.put(`/appointments/${appointment.id}`, appointment.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments')
        handleCloseDialog()
      },
    }
  )

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/appointments/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments')
      },
    }
  )

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment)
      setFormData({
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        location: appointment.location || '',
        description: appointment.description || '',
        status: appointment.status,
        type: appointment.type,
      })
    } else {
      setEditingAppointment(null)
      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        status: 'pending',
        type: 'meeting',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingAppointment(null)
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      status: 'pending',
      type: 'meeting',
    })
  }

  const handleSubmit = () => {
    if (editingAppointment) {
      updateMutation.mutate({
        id: editingAppointment.id!,
        data: formData,
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个预约吗？')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <Box>加载中...</Box>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">
          预约管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新建预约
        </Button>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>标题</TableCell>
              <TableCell>开始时间</TableCell>
              <TableCell>结束时间</TableCell>
              <TableCell>地点</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments?.map((appointment: Appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>{appointment.title}</TableCell>
                <TableCell>{format(new Date(appointment.startTime), 'YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>{format(new Date(appointment.endTime), 'YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>{appointment.location || '-'}</TableCell>
                <TableCell>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: {
                        pending: '#ff9800',
                        confirmed: '#4caf50',
                        completed: '#2196f3',
                        cancelled: '#f44336',
                      }[appointment.status],
                    }}
                  >
                    {appointment.status}
                  </span>
                </TableCell>
                <TableCell>{appointment.type}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(appointment)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(appointment.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAppointment ? '编辑预约' : '新建预约'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="标题"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="开始时间"
            type="datetime-local"
            fullWidth
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
          <TextField
            margin="dense"
            label="结束时间"
            type="datetime-local"
            fullWidth
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
          <TextField
            margin="dense"
            label="地点"
            fullWidth
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <TextField
            margin="dense"
            label="描述"
            multiline
            fullWidth
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <MenuItem value="pending">待确认</MenuItem>
              <MenuItem value="confirmed">已确认</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>类型</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <MenuItem value="meeting">会议</MenuItem>
              <MenuItem value="appointment">预约</MenuItem>
              <MenuItem value="reminder">提醒</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAppointment ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Appointments