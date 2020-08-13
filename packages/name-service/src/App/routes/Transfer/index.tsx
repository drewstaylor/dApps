import { Coin } from "@cosmjs/launchpad";
import { Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useAccount, useError, useSdk } from "../../../service";
import { printableCoin } from "../../../service/helpers";
import Center from "../../../theme/layout/Center";
import Stack from "../../../theme/layout/Stack";
import BackButton from "../../components/BackButton";
import Loading from "../../components/Loading";
import YourAccount from "../../components/YourAccount";
import { pathContract, pathOperationResult } from "../../paths";
import { getErrorFromStackTrace } from "../../utils/errors";
import { OperationResultState } from "../OperationResult";
import FormTransferName from "./FormTransferName";
import "./Transfer.less";

const { Title, Text } = Typography;

interface TransferState {
  readonly contractLabel: string;
  readonly contractAddress: string;
  readonly name: string;
}

function Transfer(): JSX.Element {
  const { name, contractLabel, contractAddress } = useLocation().state as TransferState;
  const fullContractPath = `${pathContract}/${contractLabel}/${contractAddress}/${name}`;

  const history = useHistory();
  const { setError } = useError();
  const { getClient } = useSdk();
  const accountProvider = useAccount();

  const [loading, setLoading] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [transferPrice, setTransferPrice] = useState<Coin>();

  useEffect(() => {
    getClient()
      .queryContractSmart(contractAddress, { config: {} })
      .then((response) => {
        setTransferPrice(response.transfer_price);
      })
      .catch(setError);
  }, [setError, contractAddress, getClient]);

  function tryTransfer() {
    setLoading(true);
    const payment = transferPrice ? [transferPrice] : undefined;

    getClient()
      .execute(
        contractAddress,
        { transfer: { name: name, to: newOwnerAddress } },
        "Transferring my name",
        payment,
      )
      .then(() => {
        accountProvider.refreshAccount();

        history.push({
          pathname: pathOperationResult,
          state: {
            success: true,
            message: `Succesfully transferred ${name} to ${newOwnerAddress}`,
            customButtonText: "Name details",
            customButtonActionPath: fullContractPath,
          } as OperationResultState,
        });
      })
      .catch((stackTrace) => {
        console.error(stackTrace);

        history.push({
          pathname: pathOperationResult,
          state: {
            success: false,
            message: "Name transfer failed:",
            error: getErrorFromStackTrace(stackTrace),
          } as OperationResultState,
        });
      });
  }

  return (
    (loading && <Loading loadingText={`Transferring name: ${name}...`} />) ||
    (!loading && (
      <Center tag="main" className="Transfer">
        <Stack>
          <BackButton path={fullContractPath} />
          <Stack className="TransferStack">
            <Title>Transfer</Title>
            <Typography>
              <Text>Name: </Text>
              <Text>{name}</Text>
            </Typography>
            <Text>to</Text>
            <FormTransferName
              setNewOwnerAddress={setNewOwnerAddress}
              transferButtonText={`Transfer ${printableCoin(transferPrice)}`}
              transferButtonAction={tryTransfer}
            />
          </Stack>
          <YourAccount tag="footer" />
        </Stack>
      </Center>
    ))
  );
}

export default Transfer;
