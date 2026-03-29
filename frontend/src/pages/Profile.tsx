import React, { useState } from 'react'
import { Typography, Paper, Box, TextField, Button, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { Person as PersonIcon } from '@mui/icons-material'

const Profile: React.FC = () => {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    })
    setIsEditing(true)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    try {
      // 这里应该调用更新用户资料的API
      // await api.put('/user/profile', formData)
      setSuccess('资料更新成功')
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || '更新失败')
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        个人设置
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar sx={{ width: 80, height: 80, mr: 3 }}>
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h5">
              {user?.name}
            </Typography>
            <Typography color="textSecondary">
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Button variant="outlined" onClick={handleEdit}>
            编辑资料
          </Button>
          <Button variant="outlined" color="error" onClick={logout}>
            退出登录
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          使用统计
        </Typography>
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
          <Box>
            <Typography color="textSecondary">
              注册时间
            </Typography>
            <Typography>
              2026-03-29
            </Typography>
          </Box>
          <Box>
            <Typography color="textSecondary">
              最后登录
            </Typography>
            <Typography>
              2026-03-29
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={isEditing}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          编辑个人资料
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="姓名"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="邮箱"
            fullWidth
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Profile