import {
  FEATURES_TITLE,
  FEATURE_ACCOUNT_OPENING,
  FEATURE_ACCOUNT_OPENING_DESC,
  FEATURE_PROCESS_PAYMENT,
  FEATURE_PROCESS_PAYMENT_DESC,
  FEATURE_MATCH_PAYMENTS,
  FEATURE_MATCH_PAYMENTS_DESC,
  FEATURE_RECONCILE_AUDIT,
  FEATURE_RECONCILE_AUDIT_DESC,
  FEATURE_COMPLIANCE_REVIEW,
  FEATURE_COMPLIANCE_REVIEW_DESC,
  FEATURE_ONBOARDING_SUPPORT,
  FEATURE_ONBOARDING_SUPPORT_DESC,
  FEATURE_ELIGIBILITY_CHECKS,
  FEATURE_ELIGIBILITY_CHECKS_DESC,
  FEATURE_INTEGRATIONS,
  FEATURE_INTEGRATIONS_DESC,
  FEATURE_SUPPORT_CENTRE,
  FEATURE_SUPPORT_CENTRE_DESC,
  FEATURE_COMMUNITY,
  FEATURE_COMMUNITY_DESC,
} from "../homeScreen.constants";

export default function FeaturesSection() {
  return (
    <div className="container-fluid pt_features">
      <h2>{FEATURES_TITLE}</h2>
      <div className="grid pt_featuregrid">
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/gettingloan.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_ACCOUNT_OPENING}</h4>
                  <p>{FEATURE_ACCOUNT_OPENING_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/balancetransfer.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_PROCESS_PAYMENT}</h4>
                  <p>{FEATURE_PROCESS_PAYMENT_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/banksafe.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_MATCH_PAYMENTS}</h4>
                  <p>{FEATURE_MATCH_PAYMENTS_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/cardholder.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_RECONCILE_AUDIT}</h4>
                  <p>{FEATURE_RECONCILE_AUDIT_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/cashwithdrawal.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_COMPLIANCE_REVIEW}</h4>
                  <p>{FEATURE_COMPLIANCE_REVIEW_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/banksupport.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_ONBOARDING_SUPPORT}</h4>
                  <p>{FEATURE_ONBOARDING_SUPPORT_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/bankdeposit.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_ELIGIBILITY_CHECKS}</h4>
                  <p>{FEATURE_ELIGIBILITY_CHECKS_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/amountcalculation.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_INTEGRATIONS}</h4>
                  <p>{FEATURE_INTEGRATIONS_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/bankservice.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_SUPPORT_CENTRE}</h4>
                  <p>{FEATURE_SUPPORT_CENTRE_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
        <div className="pt_glow">
          <div className="card">
            <div className="inner">
              <div className="pt_feature">
                <div className="pt_featureimage">
                  <lottie-player
                    autoplay
                    loop
                    mode="normal"
                    src="/json/bankofficer.json?v=1"
                  ></lottie-player>
                </div>
                <div className="pt_featuretext">
                  <h4>{FEATURE_COMMUNITY}</h4>
                  <p>{FEATURE_COMMUNITY_DESC}</p>
                </div>
              </div>
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
