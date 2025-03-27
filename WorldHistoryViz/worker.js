/**
 * 世界历史地图 Cloudflare Worker 入口文件
 * 负责处理请求并提供静态资源
 */

export default {
  /**
   * 处理所有传入的HTTP请求
   * @param {Request} request - 客户端请求对象
   * @param {Object} env - 环境变量和绑定
   * @param {Object} ctx - 执行上下文
   * @returns {Response} HTTP响应
   */
  async fetch(request, env, ctx) {
    // 获取请求的URL
    const url = new URL(request.url);
    const path = url.pathname;
    
    console.log(`处理请求: ${path}`);
    
    try {
      // 如果请求的是根路径，则重定向到index.html
      if (path === '/' || path === '') {
        return Response.redirect(`${url.origin}/index.html`, 301);
      }
      
      // 为不同类型的请求构建适当的响应
      // 使用相对路径获取资源
      const resourcePath = path.startsWith('/') ? path.substring(1) : path;
      
      // 从环境的静态资源中获取资源
      let response = await env.ASSETS.fetch(request);
      
      // 如果资源不存在，尝试默认文件
      if (!response || response.status === 404) {
        if (path.endsWith('/')) {
          // 对于目录请求，尝试获取index.html
          response = await env.ASSETS.fetch(new Request(`${url.origin}/${resourcePath}index.html`));
        } else if (!path.includes('.')) {
          // 对于没有扩展名的路径，尝试获取.html版本
          response = await env.ASSETS.fetch(new Request(`${url.origin}/${resourcePath}.html`));
        }
      }
      
      // 如果仍未找到资源，返回404页面
      if (!response || response.status === 404) {
        return new Response('资源未找到', { status: 404 });
      }
      
      // 设置CORS头部
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // 构建响应
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error('处理请求时出错:', error);
      return new Response('服务器错误: ' + error.message, { status: 500 });
    }
  }
}; 