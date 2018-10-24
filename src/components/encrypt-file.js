import React from 'react'
import { Field, reduxForm } from 'redux-form';
import { Header, Button, Form, Progress, Segment } from 'semantic-ui-react';
import TrezorConnect, { UI } from 'trezor-connect';
import moment from 'moment';

import SemanticFormField from './common/semantic-ui-form';
import eta from './common/eta';
import { required, maxLength255 } from '../helpers/validation';
import { encryptFile } from 'cryptee-core';
import { binarySave } from '../helpers/binary-save'

const FormName = 'encryptFileForm';
  
type EncryptFileState = {
    progress: number;
    progressTotal: number;
    lastProgressDelta: number;
    lastPerformanceDeltaMiliseconds: number;
}

class EncryptFile extends React.Component<{}, EncryptFileState> {
    constructor(props) {
        super(props);

        this.state = {
            progress: 0,
            progressTotal: 0,
            lastProgressDelta: 0,
            lastPerformanceDeltaMiliseconds: 0
        }
    }
    onEncryptFile = values => {
        this.setState({ progressTotal: 0, lastPerformanceDeltaMiliseconds: 0, lastProgressDelta: 0 })
        
        let start;
        const callback = (setState) => ({ progress, total }) => {
            const p = progress + 1;
            if (progress === 0) {
                start = Date.now();
            }

            this.setState((prevState) => {
                let lastProgressDelta = prevState.lastProgressDelta;
                const progressDelta = Math.round((p / prevState.progressTotal) * 100);

                let lastPerformanceDeltaMiliseconds = prevState.lastPerformanceDeltaMiliseconds;

                if (lastProgressDelta < progressDelta) {
                    lastProgressDelta = progressDelta;
                    lastPerformanceDeltaMiliseconds = Date.now() - start;
                }

                return { 
                    progress: p,
                    lastProgressDelta,
                    lastPerformanceDeltaMiliseconds
                }
            })
        }

        //TrezorConnect.on(UI.BUNDLE_PROGRESS, callback(this.setState))

        encryptFile(values.file[0], values.key).then(encryptedFile => {
            binarySave(values.encryptedFileName, encryptedFile)
        })

        

        //const encryptedFile = encryptFile(cipherValueArray, values.key)
        

        //TrezorConnect.off(UI.BUNDLE_PROGRESS, callback(this.setState))
    }
    render() {
        const { submitting, pristine, handleSubmit } = this.props;
        const leftMs = (100 - this.state.lastProgressDelta) * (this.state.lastPerformanceDeltaMiliseconds / this.state.lastProgressDelta);
        const left = isNaN(leftMs) ? undefined : moment.duration(leftMs, "ms");
        return <Segment raised>
            <Header as='h1'>Encrypt file</Header>
            <Form onSubmit={handleSubmit(this.onEncryptFile)} autoComplete="off">
                <Field name="key" component={SemanticFormField} as={Form.Input} type="password" label="Key" validate={[required, maxLength255]} />
                <Field name="confirmKey" component={SemanticFormField} as={Form.Input} type="password" label="Confirm key" validate={[required, maxLength255]} />
                <Field name="file" component={SemanticFormField} as={Form.Input} type="file" label="File" validate={required} />
                <Field name="encryptedFileName" component={SemanticFormField} as={Form.Input} type="text" label="File name" validate={required} />
                {(this.state.progressTotal > 0) && <Progress value={this.state.progress} total={this.state.progressTotal} progress='percent' autoSuccess precision={0}>
                { left && this.state.lastProgressDelta < 100 && `ETA: ${eta(left)}`}
                </Progress>}
                <Button primary loading={submitting} disabled={pristine || submitting}>Encrypt</Button>
            </Form>
        </Segment>
    }
}

const validate = values => {
    const errors = {}
    if (values.key !== values.confirmKey) {
        errors.confirmKey = `Keys doesn't match`
    }
    if (values.file === undefined || values.file.length === 0) {
        errors.file = `File is required`
    }
    return errors
  }

export default reduxForm({
    form: FormName,
    enableReinitialize: true,
    validate
})(EncryptFile);