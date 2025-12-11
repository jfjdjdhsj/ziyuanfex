const express = require('express');
const database = require('./database');
const adminAPI = require('./admin');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 渲染首页
async function renderIndexPage(searchQuery = '') {
  const template = await fs.readFile(
    path.join(__dirname, '../templates/index.html'), 
    'utf8'
  );

  let resources;
  if (searchQuery) {
    resources = await database.searchResources(searchQuery);
  } else {
    resources = await database.getAllResources();
  }

  // 简单的模板替换
  let html = template;
  
  // 替换搜索查询
  html = html.replace(/{{ search_query if search_query else '' }}/, searchQuery);
  html = html.replace(/{{ search_query }}/g, searchQuery);
  
  if (resources.length > 0) {
    // 生成资源卡片
    const resourcesHtml = resources.map(item => `
      <article class="resource-card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="status-dot"></div>
            <h2>${item.name}</h2>
          </div>
          <time class="resource-date">${item.created_at || ''}</time>
        </div>
        
        ${item.description ? `<p class="resource-desc">${item.description}</p>` : ''}

        ${item.tags ? `
          <div class="resource-tags">
            ${item.tags.split(',').map(tag => 
              tag.trim() ? `<span class="resource-tag">${tag.trim()}</span>` : ''
            ).join('')}
          </div>
        ` : ''}

        <div class="resource-actions">
          ${item.tg_link ? `
            <a href="${item.tg_link}" target="_blank" class="resource-btn btn-tg">✈️ Telegram 频道</a>
          ` : ''}

          ${item.pan_link ? `
            <div class="download-group">
              <a href="${item.pan_link}" target="_blank" class="btn-pan">
                ☁️ 下载资源
              </a>
              ${item.pan_pass ? `<div class="pan-password">密码: ${item.pan_pass}</div>` : ''}
            </div>
          ` : ''}
        </div>
      </article>
    `).join('');
    
    // 替换资源列表
    html = html.replace(/{% if resources %}/, '').replace(/{% else %}[\s\S]*?{% endif %}/, '');
    html = html.replace(/{% for item in resources %}[\s\S]*?{% endfor %}/, resourcesHtml);
  } else {
    // 空状态
    html = html.replace(/{% if resources %}[\s\S]*?{% else %}/, '');
    if (searchQuery) {
      html = html.replace(/{% if search_query %}[\s\S]*?{% else %}/, '');
      html = html.replace(/{% endif %}/, '');
      html = html.replace(/{% endif %}[\s\S]*$/, '');
    } else {
      html = html.replace(/{% if search_query %}[\s\S]*?{% else %}/, '');
      html = html.replace(/{% endif %}[\s\S]*?{% endif %}/, '');
    }
  }

  // 替换数量统计
  html = html.replace(/{{ resources\|length }}/, resources.length);

  return html;
}

// 路由定义
app.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    const html = await renderIndexPage(searchQuery);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('首页渲染错误:', error);
    res.status(500).send('服务器错误');
  }
});

app.get('/admin/700370', async (req, res) => {
  try {
    const html = await adminAPI.renderAdminPage();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('管理页面渲染错误:', error);
    res.status(500).send('服务器错误');
  }
});

app.get('/admin/edit/:id', async (req, res) => {
  try {
    const resourceId = req.params.id;
    const html = await adminAPI.renderEditPage(resourceId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('编辑页面渲染错误:', error);
    res.status(500).send('服务器错误');
  }
});

// API路由
app.post('/admin/700370', async (req, res) => {
  try {
    await adminAPI.addResource(req.body);
    res.redirect('/admin/700370');
  } catch (error) {
    console.error('添加资源错误:', error);
    res.status(500).send('添加失败');
  }
});

app.post('/admin/edit/:id', async (req, res) => {
  try {
    const resourceId = req.params.id;
    const success = await adminAPI.updateResource(resourceId, req.body);
    
    if (success) {
      res.redirect('/admin/700370');
    } else {
      res.status(404).send('资源不存在');
    }
  } catch (error) {
    console.error('更新资源错误:', error);
    res.status(500).send('更新失败');
  }
});

app.post('/admin/update_order', async (req, res) => {
  try {
    const orderData = req.body;
    await adminAPI.updateOrder(orderData);
    res.json({ success: true, message: '排序更新成功！' });
  } catch (error) {
    console.error('更新排序错误:', error);
    res.json({ success: false, message: '更新失败' });
  }
});

app.post('/admin/delete/:id', async (req, res) => {
  try {
    const resourceId = req.params.id;
    const success = await adminAPI.deleteResource(resourceId);
    
    if (success) {
      res.redirect('/admin/700370');
    } else {
      res.status(404).send('资源不存在');
    }
  } catch (error) {
    console.error('删除资源错误:', error);
    res.status(500).send('删除失败');
  }
});

// API接口
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await database.getAllResources();
    res.json(resources);
  } catch (error) {
    console.error('获取资源列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 导出为Vercel函数
module.exports = app;
