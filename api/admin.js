const database = require('./database');

class AdminAPI {
  // 渲染管理页面
  async renderAdminPage() {
    const resources = await database.getAllResources();
    
    const template = await require('fs').promises.readFile(
      require('path').join(__dirname, '../templates/admin.html'), 
      'utf8'
    );

    // 简单的模板替换（生产环境建议使用模板引擎）
    let html = template;
    
    if (resources.length > 0) {
      const resourcesHtml = resources.map(item => `
        <li class="resource-item" data-id="${item.id}">
          <div class="resource-name">${item.name}</div>
          ${item.r_type ? `<div class="resource-type">${item.r_type}</div>` : ''}
          ${item.description ? `<div class="resource-desc">${item.description.substring(0, 60)}...</div>` : ''}
        </li>
      `).join('');
      
      html = html.replace('{% if resources %}', '').replace('{% else %}', '').replace('{% endif %}', '');
      html = html.replace(
        /{% for item in resources %}[\s\S]*?{% endfor %}/,
        resourcesHtml
      );
    } else {
      html = html.replace(/{% if resources %}[\s\S]*?{% else %}/, '');
      html = html.replace(/{% endif %}[\s\S]*$/, '');
    }

    return html;
  }

  // 渲染编辑页面
  async renderEditPage(resourceId) {
    const resource = await database.getResourceById(resourceId);
    
    if (!resource) {
      return '资源不存在';
    }

    const template = await require('fs').promises.readFile(
      require('path').join(__dirname, '../templates/edit.html'), 
      'utf8'
    );

    // 简单的模板替换
    let html = template;
    
    // 替换资源数据
    Object.keys(resource).forEach(key => {
      const regex = new RegExp(`{{\\s*resource\\.${key}\\s*or\\s*['"]*['"]*\\s*}}`, 'g');
      html = html.replace(regex, resource[key] || '');
    });

    // 处理select选项
    const typeOptions = ['软件工具', '影视资源', '学习教程', '游戏资源', '文档资料', '其他'];
    const selectHtml = typeOptions.map(type => 
      `<option value="${type}" ${resource.r_type === type ? 'selected' : ''}>${type}</option>`
    ).join('');
    
    html = html.replace(/<select name="r_type"[^>]*>[\s\S]*?<\/select>/, 
      `<select name="r_type" class="form-input"><option value="">选择类型</option>${selectHtml}</select>`);

    return html;
  }

  // 添加资源
  async addResource(formData) {
    const resourceData = {
      name: formData.get('name'),
      r_type: formData.get('r_type') || '',
      description: formData.get('description') || '',
      tg_link: formData.get('tg_link') || '',
      pan_link: formData.get('pan_link') || '',
      pan_pass: formData.get('pan_pass') || '',
      tags: formData.get('tags') || ''
    };

    await database.addResource(resourceData);
    return true;
  }

  // 更新资源
  async updateResource(resourceId, formData) {
    const resourceData = {
      name: formData.get('name'),
      r_type: formData.get('r_type') || '',
      description: formData.get('description') || '',
      tg_link: formData.get('tg_link') || '',
      pan_link: formData.get('pan_link') || '',
      pan_pass: formData.get('pan_pass') || '',
      tags: formData.get('tags') || ''
    };

    const updated = await database.updateResource(resourceId, resourceData);
    return updated !== null;
  }

  // 删除资源
  async deleteResource(resourceId) {
    return await database.deleteResource(resourceId);
  }

  // 更新排序
  async updateOrder(orderData) {
    return await database.updateOrder(orderData);
  }
}

module.exports = new AdminAPI();
