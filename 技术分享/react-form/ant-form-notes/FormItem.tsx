import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import PureRenderMixin from 'rc-util/lib/PureRenderMixin';
import Row from '../grid/row';
import Col, { ColProps } from '../grid/col';
import { WrappedFormUtils } from './Form';
import { FIELD_META_PROP } from './constants';
import warning from '../_util/warning';

export interface FormItemProps {
  prefixCls?: string;
  id?: string;
  label?: React.ReactNode;
  labelCol?: ColProps;
  wrapperCol?: ColProps;
  help?: React.ReactNode;
  extra?: React.ReactNode;
  validateStatus?: 'success' | 'warning' | 'error' | 'validating';
  hasFeedback?: boolean;
  className?: string;
  required?: boolean;
  style?: React.CSSProperties;
  colon?: boolean;
}

export interface FormItemContext {
  form: WrappedFormUtils;
  vertical: boolean;
}

export default class FormItem extends React.Component<FormItemProps, any> {
  static defaultProps = {
    hasFeedback: false,
    prefixCls: 'ant-form',
    colon: true,
  };

  static propTypes = {
    prefixCls: PropTypes.string,
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    labelCol: PropTypes.object,
    help: PropTypes.oneOfType([PropTypes.node, PropTypes.bool]),
    validateStatus: PropTypes.oneOf(['', 'success', 'warning', 'error', 'validating']),
    hasFeedback: PropTypes.bool,
    wrapperCol: PropTypes.object,
    className: PropTypes.string,
    id: PropTypes.string,
    children: PropTypes.node,
    colon: PropTypes.bool,
  };

  static contextTypes = {
    form: PropTypes.object,
    vertical: PropTypes.bool,
  };

  context: {
    form: WrappedFormUtils,
    vertical: boolean,
  };

  componentDidMount() {
    warning(
      this.getControls(this.props.children, true).length <= 1,
      '`Form.Item` cannot generate `validateStatus` and `help` automatically, ' +
      'while there are more than one `getFieldDecorator` in it.',
    );
  }

  shouldComponentUpdate(...args) {
    return PureRenderMixin.shouldComponentUpdate.apply(this, args);
  }

  // 获取校验信息
  getHelpMsg() {
    const context = this.context;
    const props = this.props;
    if (props.help === undefined && context.form) {
      return this.getId() ? (context.form.getFieldError(this.getId()) || []).join(', ') : '';
    }

    return props.help;
  }

  getControls(children, recursively: boolean) {
    let controls: React.ReactElement<any>[] = [];
    const childrenArray = React.Children.toArray(children);

    for (let i = 0; i < childrenArray.length; i++) {
      if (!recursively && controls.length > 0) {
        break;
      }

      const child = childrenArray[i] as React.ReactElement<any>;
      if (child.type as any === FormItem) {
        continue;
      }
      if (!child.props) {
        continue;
      }
      if (FIELD_META_PROP in child.props) {
        controls.push(child);
      } else if (child.props.children) {
        controls = controls.concat(this.getControls(child.props.children, recursively));
      }
    }
    return controls;
  }

  getOnlyControl() {
    const child = this.getControls(this.props.children, false)[0];
    return child !== undefined ? child : null;
  }

  // 获取Item prop值
  getChildProp(prop) {
    const child = this.getOnlyControl() as React.ReactElement<any>;
    return child && child.props && child.props[prop];
  }

  // 获取 Item Id
  getId() {
    return this.getChildProp('id');
  }

  // 获取 from store 中Id
  getMeta() {
    return this.getChildProp(FIELD_META_PROP);
  }

  // 渲染 help信息或校验信息
  renderHelp() {
    const prefixCls = this.props.prefixCls;
    const help = this.getHelpMsg();
    return help ? (
      <div className={`${prefixCls}-explain`} key="help">
        {help}
      </div>
    ) : null;
  }

  // 渲染 额外的提示信息
  renderExtra() {
    const { prefixCls, extra } = this.props;
    return extra ? (
      <div className={`${prefixCls}-extra`}>{extra}</div>
    ) : null;
  }

  // 获取当前字段的校验状态,通过rc-form 提供的校验方法
  getValidateStatus() {
    const { isFieldValidating, getFieldError, getFieldValue } = this.context.form;
    const fieldId = this.getId();
    if (!fieldId) {
      return '';
    }
    if (isFieldValidating(fieldId)) {
      return 'validating';
    }
    if (!!getFieldError(fieldId)) {
      return 'error';
    }
    const fieldValue = getFieldValue(fieldId);
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      return 'success';
    }
    return '';
  }

  // 渲染 校验状态
  renderValidateWrapper(c1, c2, c3) {
    let classes = '';
    const form = this.context.form;
    const props = this.props;
    const validateStatus = (props.validateStatus === undefined && form) ?
      this.getValidateStatus() :
      props.validateStatus;

    if (validateStatus) {
      classes = classNames(
        {
          'has-feedback': props.hasFeedback,
          'has-success': validateStatus === 'success',
          'has-warning': validateStatus === 'warning',
          'has-error': validateStatus === 'error',
          'is-validating': validateStatus === 'validating',
        },
      );
    }
    return (
      <div className={`${this.props.prefixCls}-item-control ${classes}`}>
        {c1}{c2}{c3}
      </div>
    );
  }

  // Item 容器，提供栅格化布局
  renderWrapper(children) {
    const { prefixCls, wrapperCol } = this.props;
    const className = classNames(
      `${prefixCls}-item-control-wrapper`,
      wrapperCol && wrapperCol.className,
    );
    return (
      <Col {...wrapperCol} className={className} key="wrapper">
        {children}
      </Col>
    );
  }

  // 判断是否必填，通过props或rules 判断
  isRequired() {
    const { required } = this.props;
    if (required !== undefined) {
      return required;
    }
    if (this.context.form) {
      const meta = this.getMeta() || {};
      const validate = (meta.validate || []);

      return validate.filter((item) => !!item.rules).some((item) => {
        return item.rules.some((rule) => rule.required);
      });
    }
    return false;
  }

  // 渲染lable 提供栅格化布局
  renderLabel() {
    const { prefixCls, label, labelCol, colon, id } = this.props;
    const context = this.context;
    const required = this.isRequired();

    const labelColClassName = classNames(
      `${prefixCls}-item-label`,
      labelCol && labelCol.className,
    );
    const labelClassName = classNames({
      [`${prefixCls}-item-required`]: required,
    });

    let labelChildren = label;
    // Keep label is original where there should have no colon
    const haveColon = colon && !context.vertical;
    // Remove duplicated user input colon
    if (haveColon && typeof label === 'string' && (label as string).trim() !== '') {
      labelChildren = (label as string).replace(/[：|:]\s*$/, '');
    }

    return label ? (
      <Col {...labelCol} className={labelColClassName} key="label">
        <label
          htmlFor={id || this.getId()}
          className={labelClassName}
          title={typeof label === 'string' ? label : ''}
        >
          {labelChildren}
        </label>
      </Col>
    ) : null;
  }

  // 处理 children
  renderChildren() {
    const props = this.props;
    const children = React.Children.map(props.children, (child) => {
      if (child && typeof child.type === 'function' && !child.props.size) {
        return React.cloneElement(child, { size: 'large' });
      }
      return child;
    });
    return [
      this.renderLabel(),
      this.renderWrapper(
        this.renderValidateWrapper(
          children,
          this.renderHelp(),
          this.renderExtra(),
        ),
      ),
    ];
  }

  renderFormItem(children) {
    const props = this.props;
    const prefixCls = props.prefixCls;
    const style = props.style;
    const itemClassName = {
      [`${prefixCls}-item`]: true,
      [`${prefixCls}-item-with-help`]: !!this.getHelpMsg(),
      [`${prefixCls}-item-no-colon`]: !props.colon,
      [`${props.className}`]: !!props.className,
    };

    return (
      <Row className={classNames(itemClassName)} style={style}>
        {children}
      </Row>
    );
  }

  render() {
    const children = this.renderChildren();
    return this.renderFormItem(children);
  }
}
