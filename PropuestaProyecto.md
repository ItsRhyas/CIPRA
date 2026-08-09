**CIPRA: Convertidor Inteligente de Píxeles a Rutas Automatizadas.**

**Componente:** Módulo de IA y Backend (Django REST Framework) \+ Frontend (Next.js)

## **1\. Objetivo General del Proyecto**

Desarrollar una aplicación web robusta capaz de transformar imágenes bidimensionales (fotografías o retratos) en trayectorias geométricas optimizadas y traducidas a un lenguaje intermedio estándar (G-Code Geométrico), con el fin de servir como el sistema de percepción y planificación para un brazo robótico articulado (SCARA).

## **2\. Arquitectura del Sistema y Stack Tecnológico**

El sistema se divide en una arquitectura desacoplada de dos capas principales:

\[ Cliente / Navegador \] \<--- (JSON / Archivos) \---\> \[ Backend de Procesamiento \]  
      (Next.js)                                         (Django REST / OpenCV)

### **A. Frontend (Capa de Interacción y Visualización)**

* **Tecnología:** Next.js (React) estructurado por componentes.  
* **Responsabilidades:**  
  * Interfaz de carga de imágenes mediante arrastrar y soltar (*drag-and-drop*).  
  * Panel de control paramétrico (ajustes de umbrales de visión y tamaño de lienzo).  
  * Previsualización interactiva de las trayectorias vectoriales y simulación del recorrido del robot mediante HTML5 Canvas.  
  * Descarga y envío del archivo .gcode final al sistema de control.

### **B. Backend (Capa de IA y Cómputo de Visión)**

* **Tecnología:** Django REST Framework (DRF).  
* **Responsabilidades:**  
  * Exposición de endpoints API REST para procesamiento asíncrono.  
  * Pipeline de procesamiento digital de imágenes (OpenCV) y álgebra lineal (NumPy).  
  * Ejecución de algoritmos de optimización combinatoria para la reducción de tiempos de trayectoria.  
  * Formateador de cadenas de texto para la generación del bloque G-Code puramente espacial.

## **3\. Pipeline de Procesamiento de la IA (Backend)**

El núcleo del backend procesará cada imagen cargada a través de un pipeline secuencial de cuatro etapas:

### **Fase 1: Preprocesamiento y Segmentación**

1. **Conversión de Espacio de Color:** Transformación de la imagen de entrada de RGB a Escala de Grises (un solo canal de intensidad).  
2. **Reducción de Ruido:** Aplicación de un filtro de desenfoque gaussiano (*Gaussian Blur*) con un núcleo determinista para suavizar texturas de fondo e imperfecciones digitales.  
3. **Aislamiento del Sujeto (Opcional/Avanzado):** Integración de un modelo de binarización adaptativa o remoción de fondos para concentrar el dibujo únicamente en las facciones esenciales del retrato.

### **Fase 2: Extracción de Bordes y Contornos**

1. **Algoritmo de Canny:** Detección de gradientes de intensidad de píxeles utilizando un umbral doble (mínimo y máximo) configurable desde el frontend para aislar líneas continuas.  
2. **Extracción Topológica de Líneas:** Utilización de cv2.findContours para agrupar los píxeles de los bordes en estructuras ordenadas de vectores de puntos $(X, Y)$.

### **Fase 3: Simplificación Geométrica y Escalado**

1. **Algoritmo de Douglas-Peucker:** Reducción drástica del número de vértices en cada contorno basándose en una tolerancia geométrica ($\\epsilon$). Esto asegura que curvas suaves no saturen el buffer del robot con micro-puntos innecesarios.  
2. **Normalización Espacial:** Conversión de las coordenadas de píxeles a unidades físicas del mundo real (milímetros) dentro del área de trabajo útil definida para el robot (ej. formato A4: $210 \\text{ mm} \\times 297 \\text{ mm}$), situando el origen $(0,0)$ en la referencia física acordada con el equipo de robótica.

### **Fase 4: Optimización de Trayectorias (Heurística TSP)**

1. **Planteamiento:** El orden nativo de extracción de contornos genera saltos ineficientes en el aire. El sistema modelará los trazos como un Problema del Viajante de Comercio (*Traveling Salesman Problem*).  
2. **Algoritmo:** Implementación de una heurística ávida (*Nearest Neighbor*) o búsqueda local para ordenar la secuencia de trazos de modo que el punto final del Trazo $N$ esté a la distancia mínima posible del punto inicial del Trazo $N+1$.

## **4\. El Contrato de Interfaz (Especificación del G-Code)**

Para garantizar la independencia absoluta del hardware (manteniendo el módulo web aislado de la cinemática inversa y los motores), la salida final de la API será exclusivamente un archivo de texto plano con instrucciones puramente geométricas. El conjunto de comandos aceptado se limita estrictamente a:

* G90: Posicionamiento absoluto.  
* G21: Unidades expresadas en milímetros.  
* M5: Comando de control para levantar el lápiz (Eje Z virtual inactivo).  
* G0 X\[valor\] Y\[valor\]: Movimiento lineal rápido en el aire hacia las coordenadas de inicio de una línea.  
* M3: Comando de control para bajar el lápiz (Eje Z virtual activo sobre el papel).  
* G1 X\[valor\] Y\[valor\]: Movimiento lineal de dibujo interpolado hacia la siguiente coordenada geométrica.

Para comprender de manera visual y experimental cómo afectarán las variables de este pipeline matemático al resultado del dibujo y a la eficiencia del robot, puedes utilizar el siguiente simulador interactivo de procesamiento.

