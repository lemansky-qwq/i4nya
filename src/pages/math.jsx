import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { isAdmin } from '../lib/pu';

export default function MathTools() {
  const [activeTool, setActiveTool] = useState('function');
  const [functionInput, setFunctionInput] = useState('x*x');
  const [functions, setFunctions] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [currentShapeType, setCurrentShapeType] = useState('point'); // point, line, circle
  const [tempShape, setTempShape] = useState(null);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [scale, setScale] = useState(50);
  const [user, setUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3498db');
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [functionColors, setFunctionColors] = useState([]);
  const [highlightedFunctionIndex, setHighlightedFunctionIndex] = useState(null);
  const navigate = useNavigate();

  // 预定义颜色选项
	const colorOptions = [
		{ name: '蓝色', value: '#3498db' },
		{ name: '红色', value: '#e74c3c' },
		{ name: '绿色', value: '#2ecc71' },
		{ name: '橙色', value: '#f39c12' },
		{ name: '紫色', value: '#9b59b6' },
		{ name: '黑色', value: '#000000' },
	];
  
  const getCurrentColor = () => selectedColor;
  
  const canvasRef = useRef(null);
  const geometryCanvasRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser);
        const adminStatus = await isAdmin(currentUser.uid);
        setIsUserAdmin(adminStatus);
      }
    };

    checkAuth();
  }, []);

  // 初始化画布
useEffect(() => {
  if (activeTool === 'function') {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    drawCoordinateSystem(ctx, canvas.width, canvas.height);
    
    functions.forEach((func, index) => {
      drawFunction(ctx, func, functionColors[index], canvas.width, canvas.height);
    });
  }
}, [functions, functionColors, activeTool, scale, highlightedFunctionIndex]);

  // 绘制几何图形
  useEffect(() => {
  if (activeTool === 'geometry') {
    const canvas = geometryCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    drawGeometry(ctx, shapes, canvas.width, canvas.height);
    
    // 绘制临时形状
    if (tempShape) {
      drawTempShape(ctx, tempShape);
    }
  }
}, [shapes, tempShape, activeTool, highlightedIndex]); // 添加 highlightedIndex 依赖

  // 绘制坐标系
  const drawCoordinateSystem = (ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    //const scale = 50;
    
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1e1e1e';
    ctx.lineWidth = 1;
    
    // 绘制坐标轴
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    
    // 绘制刻度
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1e1e1e';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X轴刻度
    for (let x = -Math.floor(centerX / scale); x <= Math.floor(centerX / scale); x++) {
      if (x !== 0) {
        const pixelX = centerX + x * scale;
        ctx.beginPath();
        ctx.moveTo(pixelX, centerY - 5);
        ctx.lineTo(pixelX, centerY + 5);
        ctx.stroke();
        ctx.fillText(x.toString(), pixelX, centerY + 8);
      }
    }
    
    // Y轴刻度
    for (let y = -Math.floor(centerY / scale); y <= Math.floor(centerY / scale); y++) {
      if (y !== 0) {
        const pixelY = centerY - y * scale;
        ctx.beginPath();
        ctx.moveTo(centerX - 5, pixelY);
        ctx.lineTo(centerX + 5, pixelY);
        ctx.stroke();
        ctx.fillText(y.toString(), centerX - 15, pixelY - 6);
      }
    }
    
    ctx.fillText('O', centerX - 8, centerY + 8);
  };

  // 绘制函数
  const drawFunction = (ctx, func, color, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  
  const isHighlighted = functions.indexOf(func) === highlightedFunctionIndex;
  ctx.strokeStyle = isHighlighted ? '#ffeb3b' : color;
  ctx.lineWidth = isHighlighted ? 4 : 2;
  ctx.beginPath();
  
  let isFirstPoint = true;
  
  for (let pixelX = 0; pixelX < width; pixelX++) {
    const x = (pixelX - centerX) / scale;
    
    try {
      let expression = func
        .replace(/\^/g, '**')
        .replace(/x\s*\*\s*x/g, `(${x})*(${x})`)
        .replace(/Math\.pow\(([^,]+),\s*([^)]+)\)/g, `Math.pow($1,$2)`)
        .replace(/x/g, `(${x})`);
      
      const y = eval(expression);
      
      if (isFinite(y)) {
        const pixelY = centerY - y * scale;
        
        if (isFirstPoint) {
          ctx.moveTo(pixelX, pixelY);
          isFirstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      } else {
        isFirstPoint = true;
      }
    } catch (error) {
      isFirstPoint = true;
    }
  }
  
  ctx.stroke();
};

  // 绘制几何图形
  const drawGeometry = (ctx, shapes, width, height) => {
  ctx.clearRect(0, 0, width, height);
  
  shapes.forEach((shape, index) => {
    // 如果是高亮的对象，使用更粗的线条和特殊颜色
    const isHighlighted = index === highlightedIndex;
    ctx.strokeStyle = isHighlighted ? '#ffeb3b' : (shape.color || getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3498db');
    ctx.lineWidth = isHighlighted ? 4 : 2;
    ctx.fillStyle = isHighlighted ? '#ffeb3b' : (shape.color || getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3498db');
    
    switch (shape.type) {
      case 'point':
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, isHighlighted ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
        break;
        
      case 'line':
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        // 绘制端点
        ctx.beginPath();
        ctx.arc(shape.x1, shape.y1, isHighlighted ? 5 : 3, 0, 2 * Math.PI);
        ctx.arc(shape.x2, shape.y2, isHighlighted ? 5 : 3, 0, 2 * Math.PI);
        ctx.fill();
        break;
        
      case 'circle':
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
        ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
        ctx.stroke();
        // 绘制圆心和半径端点
        ctx.beginPath();
        ctx.arc(shape.x1, shape.y1, isHighlighted ? 5 : 3, 0, 2 * Math.PI);
        ctx.arc(shape.x2, shape.y2, isHighlighted ? 5 : 3, 0, 2 * Math.PI);
        ctx.fill();
        break;
        
      default:
        break;
    }
  });
};

  // 绘制临时形状
  const drawTempShape = (ctx, shape) => {
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--warning-color') || '#f39c12';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    switch (shape.type) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        break;
        
      case 'circle':
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
        ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      default:
        break;
    }
    
    ctx.setLineDash([]);
  };

  // 几何画布点击处理
  const handleGeometryCanvasClick = (e) => {
  if (activeTool !== 'geometry') return;
  
  const canvas = geometryCanvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (currentShapeType === 'point') {
    const newShape = { 
      type: 'point', 
      x, y, 
      color: getCurrentColor()  // 使用选中的颜色
    };
    setShapes([...shapes, newShape]);
  } else if (currentShapeType === 'line' || currentShapeType === 'circle') {
    if (!tempShape) {
      setTempShape({ 
        type: currentShapeType, 
        x1: x, y1: y, x2: x, y2: y 
      });
    } else {
      const newShape = { 
        type: currentShapeType, 
        x1: tempShape.x1, 
        y1: tempShape.y1, 
        x2: x, 
        y2: y,
        color: getCurrentColor()  // 使用选中的颜色
      };
      setShapes([...shapes, newShape]);
      setTempShape(null);
    }
  }
};

  // 几何画布鼠标移动处理
  const handleGeometryCanvasMouseMove = (e) => {
    if (activeTool !== 'geometry' || !tempShape) return;
    
    const canvas = geometryCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setTempShape({ ...tempShape, x2: x, y2: y });
  };

  // 添加函数
  const addFunction = () => {
  if (functionInput.trim()) {
    setFunctions([...functions, functionInput.trim()]);
    setFunctionColors([...functionColors, getCurrentColor()]); // 记录函数颜色
    setFunctionInput('');
  }
};

  // 计算表达式
  const calculateExpression = () => {
    try {
      const result = eval(calcInput);
      setCalcResult(result.toString());
    } catch (error) {
      setCalcResult('错误: 无效表达式');
    }
  };

  // 获取随机颜色
  const getRandomColor = () => {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // 清除画布
  const clearCanvas = () => {
    if (activeTool === 'function') {
      setFunctions([]);
    } else if (activeTool === 'geometry') {
      setShapes([]);
      setTempShape(null);
    }
  };

  // 删除最后一个形状
  const undoLastShape = () => {
    if (shapes.length > 0) {
      setShapes(shapes.slice(0, -1));
    }
  };

  // 删除函数
const removeFunction = (index) => {
  setFunctions(functions.filter((_, i) => i !== index));
  setFunctionColors(functionColors.filter((_, i) => i !== index));
};

// 删除几何对象
const removeShape = (index) => {
  setShapes(shapes.filter((_, i) => i !== index));
};

  return (
    <div style={{ maxWidth: 1400, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 className="text-primary">数学工具 v1.3</h1>
      <p className="text-secondary">函数绘图、几何作图与数学计算</p>

      {/* 工具选择 */}
      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button 
            className={`btn ${activeTool === 'function' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTool('function')}
          >
            函数绘图
          </button>
          <button 
            className={`btn ${activeTool === 'geometry' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTool('geometry')}
          >
            几何作图
          </button>
          <button 
            className={`btn ${activeTool === 'calculator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTool('calculator')}
          >
            数学计算
          </button>
          <button className="btn btn-warning" onClick={clearCanvas}>
            清除
          </button>
        </div>

        {/* 函数绘图界面 */}
        {activeTool === 'function' && (
  <div>
    <h3 className="text-primary">函数绘图</h3>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label className="text-secondary" style={{ whiteSpace: 'nowrap' }}>比例尺:</label>
        <input
          className="input"
          type="number"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          style={{ width: '80px' }}
          min="10"
          max="200"
        />
      </div>
      
      {/* 函数颜色选择器 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label className="text-secondary">颜色:</label>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color.value,
                border: selectedColor === color.value ? '2px solid #fff' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color.name}
            />
          ))}
        </div>
      </div>
      
      <input
        className="input"
        type="text"
        value={functionInput}
        onChange={(e) => setFunctionInput(e.target.value)}
        placeholder="输入函数表达式，如: x*x, Math.sin(x), Math.pow(2,x)"
        style={{ flex: 1, minWidth: '200px' }}
      />
      <button className="btn btn-primary" onClick={addFunction}>
        添加函数
      </button>
    </div>
    <div className="card">
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '500px',
          border: '1px solid var(--card-border)',
          borderRadius: '4px'
        }}
      />
    </div>
    {functions.length > 0 && (
      <div className="card">
        <h4 className="text-primary">已添加的函数:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {functions.map((func, index) => (
            <div
              key={index}
              onMouseEnter={() => setHighlightedFunctionIndex(index)}
              onMouseLeave={() => setHighlightedFunctionIndex(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: highlightedFunctionIndex === index ? 'var(--warning-bg)' : 'var(--card-bg)',
                border: `1px solid ${highlightedFunctionIndex === index ? 'var(--warning-color)' : 'var(--card-border)'}`,
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: functionColors[index],
                  borderRadius: '2px',
                  border: '1px solid #ccc'
                }}
              />
              <span className="text-secondary">y = {func}</span>
              <button
                className="btn btn-danger"
                onClick={() => removeFunction(index)}
                style={{ 
                  padding: '0.2rem 0.4rem', 
                  fontSize: '0.7rem',
                  margin: 0
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        {/* 几何作图界面 */}
        {activeTool === 'geometry' && (
  <div>
    <h3 className="text-primary">几何作图</h3>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* 几何工具按钮 */}
      <button 
        className={`btn ${currentShapeType === 'point' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => {
          setCurrentShapeType('point');
          setTempShape(null);
        }}
      >
        点
      </button>
      <button 
        className={`btn ${currentShapeType === 'line' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => {
          setCurrentShapeType('line');
          setTempShape(null);
        }}
      >
        线段
      </button>
      <button 
        className={`btn ${currentShapeType === 'circle' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => {
          setCurrentShapeType('circle');
          setTempShape(null);
        }}
      >
        圆
      </button>
      
      {/* 颜色选择器 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label className="text-secondary">颜色:</label>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color.value,
                border: selectedColor === color.value ? '2px solid #fff' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color.name}
            />
          ))}
        </div>
      </div>
      
      <button className="btn btn-danger" onClick={undoLastShape}>
        撤销
      </button>
    </div>
            <p className="text-secondary">
              {currentShapeType === 'point' && '点击画布添加点'}
              {currentShapeType === 'line' && '点击确定线段起点，再次点击确定终点'}
              {currentShapeType === 'circle' && '点击确定圆心，再次点击确定半径'}
            </p>
            <div className="card">
              <canvas 
                ref={geometryCanvasRef}
                onClick={handleGeometryCanvasClick}
                onMouseMove={handleGeometryCanvasMouseMove}
                style={{ 
                  width: '100%', 
                  height: '500px', // 增大画布高度
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  cursor: 'crosshair'
                }}
              />
            </div>
            {shapes.length > 0 && (
  <div className="card">
    <h4 className="text-primary">几何对象 ({shapes.length})</h4>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
      {shapes.map((shape, index) => (
        <div 
          key={index}
          onMouseEnter={() => setHighlightedIndex(index)}
          onMouseLeave={() => setHighlightedIndex(null)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem',
            background: highlightedIndex === index ? 'var(--warning-bg)' : 'var(--card-bg)',
            border: `1px solid ${highlightedIndex === index ? 'var(--warning-color)' : 'var(--card-border)'}`,
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {/* 颜色移到左边 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: shape.color,
                borderRadius: '2px',
                border: '1px solid #ccc'
              }}
            />
            <div>
              {shape.type === 'point' && `点 (${Math.round(shape.x)}, ${Math.round(shape.y)})`}
              {shape.type === 'line' && `线段 (${Math.round(shape.x1)},${Math.round(shape.y1)}) → (${Math.round(shape.x2)},${Math.round(shape.y2)})`}
              {shape.type === 'circle' && `圆 圆心(${Math.round(shape.x1)},${Math.round(shape.y1)}) 半径:${Math.round(Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2)))}`}
            </div>
          </div>
          <button
            className="btn btn-danger"
            onClick={() => removeShape(index)}
            style={{ 
              padding: '0.2rem 0.4rem', 
              fontSize: '0.7rem',
              margin: 0
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </div>
)}
          </div>
        )}

        {/* 数学计算界面 */}
        {activeTool === 'calculator' && (
          <div>
            <h3 className="text-primary">数学计算器</h3>
            <div className="card">
              <input
                className="input"
                type="text"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="输入数学表达式，如: 2+3*4, Math.sqrt(16), Math.PI"
                style={{ width: '100%', marginBottom: '1rem' }}
              />
              <button className="btn btn-primary" onClick={calculateExpression}>
                计算
              </button>
              
              {calcResult && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '4px' }}>
                  <strong className="text-primary">结果: </strong>
                  <span className="text-success">{calcResult}</span>
                </div>
              )}
            </div>
            
            <div className="card">
              <h4 className="text-primary">示例表达式:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {[
                  '2 + 3 * 4',
                  'Math.sin(Math.PI / 2)',
                  'Math.sqrt(16)',
                  'Math.pow(2, 8)',
                  'Math.log(10)',
                  '2 * Math.PI'
                ].map((example, index) => (
                  <button
                    key={index}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => setCalcInput(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="text-primary">使用说明</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <h4 className="text-secondary">函数绘图</h4>
            <p className="text-muted">支持基本的数学表达式，使用 x 作为变量</p>
            <ul className="text-muted" style={{ fontSize: '0.9rem' }}>
              <li>二次函数: x*x</li>
              <li>三角函数: Math.sin(x)</li>
              <li>指数函数: Math.pow(2,x)</li>
              <li><small>注意: ^ 是异或运算符，请使用 Math.pow() 或 x*x</small></li>
            </ul>
          </div>
          <div>
            <h4 className="text-secondary">几何作图</h4>
            <p className="text-muted">支持点、线段、圆的绘制</p>
            <ul className="text-muted" style={{ fontSize: '0.9rem' }}>
              <li>点: 直接点击添加</li>
              <li>线段: 点击起点和终点</li>
              <li>圆: 点击圆心和半径端点</li>
              <li>撤销: 删除最后一个形状</li>
            </ul>
          </div>
          <div>
            <h4 className="text-secondary">数学计算</h4>
            <p className="text-muted">支持 JavaScript 数学表达式</p>
            <ul className="text-muted" style={{ fontSize: '0.9rem' }}>
              <li>基本运算: +, -, *, /</li>
              <li>数学函数: Math.sqrt(), Math.sin()</li>
              <li>常数: Math.PI, Math.E</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}