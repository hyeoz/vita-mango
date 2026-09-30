#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE(VMLiveActivity, NSObject)
RCT_EXTERN_METHOD(execute:(NSString *)command payload:(NSString *)payload
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
