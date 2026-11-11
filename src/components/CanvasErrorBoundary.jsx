import React from "react";

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("[canvas] 3D 배경을 그리지 못해 대체 화면을 표시합니다.", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback === undefined ? null : this.props.fallback;
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;
