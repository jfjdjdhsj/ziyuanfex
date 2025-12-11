const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/resources.json');

class Database {
  async loadData() {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // 如果文件不存在，返回默认数据
      return {
        resources: [],
        next_id: 1
      };
    }
  }

  async saveData(data) {
    try {
      // 确保data目录存在
      const dataDir = path.dirname(DATA_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  }

  async getAllResources() {
    const data = await this.loadData();
    return data.resources.sort((a, b) => a.sort_order - b.sort_order);
  }

  async getResourceById(id) {
    const resources = await this.getAllResources();
    return resources.find(r => r.id == id);
  }

  async addResource(resourceData) {
    const data = await this.loadData();
    
    const newResource = {
      id: data.next_id,
      ...resourceData,
      sort_order: data.resources.length,
      created_at: new Date().toISOString().split('T')[0]
    };

    data.resources.push(newResource);
    data.next_id += 1;
    
    await this.saveData(data);
    return newResource;
  }

  async updateResource(id, resourceData) {
    const data = await this.loadData();
    const index = data.resources.findIndex(r => r.id == id);
    
    if (index === -1) {
      return null;
    }

    // 保持原有数据不变，只更新提供的字段
    data.resources[index] = {
      ...data.resources[index],
      ...resourceData
    };
    
    await this.saveData(data);
    return data.resources[index];
  }

  async deleteResource(id) {
    const data = await this.loadData();
    const index = data.resources.findIndex(r => r.id == id);
    
    if (index === -1) {
      return false;
    }

    data.resources.splice(index, 1);
    
    // 重新排序
    data.resources.forEach((resource, index) => {
      resource.sort_order = index;
    });
    
    await this.saveData(data);
    return true;
  }

  async updateOrder(orderData) {
    const data = await this.loadData();
    
    orderData.forEach((id, index) => {
      const resource = data.resources.find(r => r.id == id);
      if (resource) {
        resource.sort_order = index;
      }
    });
    
    await this.saveData(data);
    return true;
  }

  async searchResources(query) {
    const resources = await this.getAllResources();
    const searchTerm = query.toLowerCase();
    
    return resources.filter(resource => 
      resource.name.toLowerCase().includes(searchTerm) ||
      (resource.tags && resource.tags.toLowerCase().includes(searchTerm)) ||
      (resource.description && resource.description.toLowerCase().includes(searchTerm))
    );
  }
}

module.exports = new Database();
